// A bounded harness around every model call.
//
// The failure this exists to prevent: a generation with no deadline, no cancel
// and no progress signal is indistinguishable from a hang, and on a machine
// running one CPU thread it effectively is one.
//
// Guarantees:
//   1. Every call has a deadline and an abort path.
//   2. Progress is observable — tokens, rate, elapsed, attempt.
//   3. A call that cannot finish inside the budget is abandoned early rather
//      than burning the whole clock.
//   4. Output passes a structural gate (JSON) and then a semantic gate
//      (validated against the real schema, in analysis.js).
//   5. At most two attempts: one turn, then one repair with the specific error.
//   6. Every path ends somewhere usable. The caller always gets a result.

import { chatStream, supportsConstraint } from "./runtime.js";
import { record, recordError } from "./diagnostics.js";

export const DEFAULTS = {
  totalBudgetMs: 90_000,
  firstAttemptMs: 60_000,
  repairAttemptMs: 25_000,
  maxTokens: 220,
  repairMaxTokens: 160,
  // Below this rate a generation cannot plausibly finish in budget, so we stop
  // rather than let the visitor watch a counter crawl.
  minTokensPerSecond: 0.4,
  // Don't start an attempt that has no realistic chance of producing anything.
  minAttemptMs: 2_000,
  // Don't judge the rate until enough tokens have arrived to measure it.
  rateGraceTokens: 12,
};

export class HarnessAbort extends Error {
  constructor(reason) {
    super(reason);
    this.name = "HarnessAbort";
  }
}

/**
 * Run one bounded, validated model call with a single repair attempt.
 *
 * @param {object}   opts
 * @param {Array}    opts.messages    chat messages
 * @param {object}   opts.schema      JSON schema for the structural gate
 * @param {Function} opts.validate    (parsed) => {ok, value, error}  semantic gate
 * @param {Function} opts.onProgress  ({attempt, tokens, rate, elapsedMs, phase})
 * @param {AbortSignal} opts.signal   external cancel (the Cancel button)
 * @param {object}   opts.limits      overrides for DEFAULTS
 * @param {Function} opts.streamFn    token source; defaults to the live model.
 *                                    Injectable so the bounds can be tested
 *                                    against slow, silent and malformed
 *                                    streams without downloading weights.
 * @returns {Promise<{ok, value, attempts, reason}>}
 */
export async function runGuarded({
  messages,
  schema,
  validate,
  onProgress,
  signal,
  limits = {},
  streamFn = null,
} = {}) {
  const cfg = { ...DEFAULTS, ...limits };
  const startedAt = performance.now();
  const attempts = [];

  const budgetLeft = () => cfg.totalBudgetMs - (performance.now() - startedAt);

  let conversation = messages;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const isRepair = attempt > 1;
    const allowance = Math.min(
      isRepair ? cfg.repairAttemptMs : cfg.firstAttemptMs,
      Math.max(0, budgetLeft())
    );

    if (allowance < cfg.minAttemptMs) {
      attempts.push({ attempt, outcome: "no-budget" });
      record("harness.exhausted", { attempt });
      break;
    }

    let raw = "";
    let outcome = "unknown";

    try {
      raw = await generateBounded({
        messages: conversation,
        schema,
        maxTokens: isRepair ? cfg.repairMaxTokens : cfg.maxTokens,
        deadlineMs: allowance,
        minRate: cfg.minTokensPerSecond,
        graceTokens: cfg.rateGraceTokens,
        signal,
        streamFn,
        onProgress: (p) => onProgress?.({ ...p, attempt }),
      });
    } catch (error) {
      const cancelled =
        error?.name === "AbortError" ||
        signal?.aborted ||
        (error instanceof HarnessAbort && error.message === "cancelled");
      if (cancelled) {
        attempts.push({ attempt, outcome: "cancelled" });
        record("harness.cancelled", { attempt });
        return { ok: false, value: null, attempts, reason: "cancelled" };
      }
      outcome = error instanceof HarnessAbort ? error.message : "error";
      attempts.push({ attempt, outcome });
      if (!(error instanceof HarnessAbort)) recordError("harness.generate", error);
      else record("harness.abandoned", { attempt, why: error.message });
      conversation = withRepair(messages, raw, "The reply did not arrive in time.");
      continue;
    }

    // Structural gate.
    const parsed = extractJSON(raw);
    if (!parsed) {
      attempts.push({ attempt, outcome: "unparseable", chars: raw.length });
      record("harness.unparseable", { attempt, chars: raw.length });
      conversation = withRepair(
        messages,
        raw,
        "That was not valid JSON. Reply with the JSON object only, no prose and no code fences."
      );
      continue;
    }

    // Semantic gate.
    const verdict = validate ? validate(parsed) : { ok: true, value: parsed };
    if (verdict.ok) {
      attempts.push({ attempt, outcome: "ok" });
      record("harness.ok", { attempt, ms: Math.round(performance.now() - startedAt) });
      return { ok: true, value: verdict.value ?? parsed, attempts, reason: "ok" };
    }

    attempts.push({ attempt, outcome: "invalid", error: verdict.error });
    record("harness.invalid", { attempt, why: verdict.error });
    conversation = withRepair(messages, raw, verdict.error);
  }

  return { ok: false, value: null, attempts, reason: attempts.at(-1)?.outcome || "failed" };
}

/** Feed the model its own reply plus the specific reason it was rejected. */
function withRepair(original, raw, error) {
  return [
    ...original,
    { role: "assistant", content: String(raw || "").slice(0, 1200) },
    { role: "user", content: `${error} Reply with the corrected JSON object only.` },
  ];
}

/**
 * One generation, bounded three ways: an external cancel, a wall-clock
 * deadline, and an early bail when the observed rate cannot finish in time.
 */
async function generateBounded({
  messages,
  schema,
  maxTokens,
  deadlineMs,
  minRate,
  graceTokens,
  signal,
  streamFn,
  onProgress,
}) {
  const controller = new AbortController();
  let reason = null;
  const onExternalAbort = () => {
    reason = "cancelled";
    controller.abort();
  };
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  const timer = setTimeout(() => {
    reason = "deadline";
    controller.abort();
  }, deadlineMs);

  const began = performance.now();
  let tokens = 0;
  let text = "";

  // The iterator is driven by hand rather than with `for await`.
  //
  // This is the fix for the original hang. A model that produces no tokens
  // never enters a `for await` body, so an abort check inside the loop never
  // runs and the pending `next()` simply blocks — which is indistinguishable
  // from a frozen page. Racing every `next()` against the abort signal means
  // the deadline holds even when the token source is completely silent.
  const source = streamFn
    ? streamFn({ messages, maxTokens, signal: controller.signal })
    : chatStream({
        messages,
        maxTokens,
        schema: supportsConstraint() ? schema : null,
        signal: controller.signal,
      });

  const iterator = source[Symbol.asyncIterator]();
  const aborted = new Promise((_, reject) => {
    const fire = () => reject(new HarnessAbort(reason || "aborted"));
    if (controller.signal.aborted) fire();
    else controller.signal.addEventListener("abort", fire, { once: true });
  });

  try {
    for (;;) {
      const step = await Promise.race([iterator.next(), aborted]);
      if (step.done) break;

      text += step.value ?? "";
      tokens += 1;

      const elapsedMs = performance.now() - began;
      const rate = tokens / Math.max(elapsedMs / 1000, 0.001);
      onProgress?.({ tokens, rate, elapsedMs, phase: "generating" });

      // Abandon early if the measured rate cannot reach the token budget in
      // the time left. Waiting out the full deadline helps nobody.
      if (tokens >= graceTokens) {
        const projectedMs = ((maxTokens - tokens) / Math.max(rate, 0.0001)) * 1000;
        if (rate < minRate || elapsedMs + projectedMs > deadlineMs * 1.5) {
          reason = "too-slow";
          controller.abort();
          break;
        }
      }
    }
  } catch (error) {
    if (!(error instanceof HarnessAbort) && !controller.signal.aborted) throw error;
    if (!reason) reason = "aborted";
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
    // Let the generator unwind rather than leaving it suspended.
    iterator.return?.().catch(() => {});
  }

  if (reason === "cancelled") throw new HarnessAbort("cancelled");
  if (reason) {
    // A partial reply can still parse; give it the chance before giving up.
    if (extractJSON(text)) return text;
    throw new HarnessAbort(reason);
  }
  return text;
}

/** First balanced JSON object in a reply. Tolerates fences and preamble. */
export function extractJSON(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
