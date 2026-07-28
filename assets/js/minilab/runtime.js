// Model runtime: pick a backend, load a model, stream from it.
//
// Two backends sit behind this façade and nothing outside it knows which is in
// use — harness.js and app.js see the same seven functions either way:
//
//   wllama  llama.cpp in WebAssembly, GGUF weights, CPU or WebGPU. The default
//           and the only backend that runs without a GPU.
//   webllm  MLC's WebGPU engine, MLC-compiled weights. Faster where it runs,
//           but it cannot run at all without navigator.gpu.
//
// This file owns everything that is true regardless of backend: the preflight
// measurement, the constraint probe, and the single-flight queue.

import * as wllama from "./backends/wllama.js";
import * as webllm from "./backends/webllm.js";
import { record } from "./diagnostics.js";

const BACKENDS = [webllm, wllama]; // first match wins; wllama is the fallback

// Planning needs a couple of hundred tokens, not thousands. A smaller context
// means a smaller KV cache and less memory traffic per token, which matters a
// great deal when there is no GPU to hide it.
const PLANNING_CTX = 4096;

// A plan is about 40 tokens. Grammar is worth using whenever 40 tokens can
// still be decoded well inside the harness's first attempt, so this is the
// share of that attempt a constrained plan may consume before it stops being
// worth the reliability it buys.
// What a plan actually costs. Used for the grammar decision below and for
// the harness's early-bail projection.
export const PLAN_TOKENS = 40;
const FIRST_ATTEMPT_MS = 80_000; // harness.js DEFAULTS.firstAttemptMs
const CONSTRAINT_BUDGET_SHARE = 0.6;

let backend = wllama;
let loadedId = null;
let loadedCtx = PLANNING_CTX;
let info = null;
let speed = null;
let constraint = { used: false, supported: false, plainTps: 0, grammarTps: 0, ratio: null, why: "not measured" };
// Resolved promise chain that serialises generations onto the one context.
let generationQueue = Promise.resolve();

export function loadedModelId() {
  return loadedId;
}

/** The context window the loaded model was given. */
export function contextWindow() {
  return loadedCtx;
}

/**
 * Measured speed of the loaded model on this machine: time to first token and
 * decode rate, from the preflight. Null until a model has loaded.
 */
export function measuredSpeed() {
  return speed;
}

/**
 * What actually loaded, as opposed to what the hardware probe hoped for.
 * @returns {{engine:string, gpu:boolean, gpuLayers:number, device:string}|null}
 */
export function backendInfo() {
  return info;
}

/** The prebuilt MLC models, or none when this browser has no WebGPU. */
export async function gpuCatalogue(hardware) {
  if (!hardware?.webgpu) return [];
  try {
    return await webllm.catalogue();
  } catch (error) {
    record("webllm.catalogue.failed", { message: error.message });
    return [];
  }
}

/**
 * Whether to constrain decoding to a JSON schema.
 *
 * A small model asked for JSON without a grammar answers in prose often enough
 * that the harness spends both its attempts on repair and then falls back. So
 * the question is not whether grammar is expensive, it is whether it is more
 * expensive than being wrong, and that is a number about this machine.
 *
 * It is measured at load rather than assumed. The previous version refused
 * grammar below 8 tok/s on the strength of a 15x figure measured before the
 * context-contention bug was fixed, which is to say on a machine that was
 * colliding with itself.
 */
export function supportsConstraint() {
  return constraint.used;
}

/** The measurement behind that decision, for the diagnostics panel. */
export function constraintReport() {
  return constraint;
}

/**
 * Download (or reuse a cached copy of) a model and load it.
 *
 * @param {object} model    catalogue entry, or {repo, file, label} from search
 * @param {object} hardware report from probeHardware()
 * @param {object} handlers {onProgress, onStage, signal}
 */
export async function loadModel(model, hardware, handlers = {}) {
  const { onStage } = handlers;

  if (loadedId === model.id) return info;
  await unloadModel();

  backend = BACKENDS.find((b) => b.canRun(model, hardware)) || wllama;

  const capped = { ...model, context: Math.min(model.context || PLANNING_CTX, PLANNING_CTX) };
  record("model.load.start", {
    model: model.id,
    backend: backend.ID,
    ctx: capped.context,
    bytes: model.size_bytes,
  });

  const began = performance.now();
  info = { engine: backend.ID, ...(await backend.load(capped, hardware, handlers)) };
  loadedCtx = info.ctx || capped.context;
  record("model.load.done", {
    model: model.id,
    backend: backend.ID,
    gpu: info.gpu,
    device: info.device,
    ms: Math.round(performance.now() - began),
  });

  // Preflight: measure this machine rather than assuming. One tiny generation
  // tells us the real time-to-first-token and decode rate, which is what the
  // deadline should be sized from and what the visitor deserves to be told.
  onStage?.("Measuring speed");
  speed = await measureSpeed();
  record("model.speed", speed);

  onStage?.("Checking output constraints");
  constraint = await measureConstraint(speed);
  record("model.constraint", constraint);

  // Only now is the model genuinely usable.
  //
  // Setting this before the preflight let the UI report "loaded" while a
  // generation was still running, so a click on Analyse started a second
  // generation on the same context. The two contended: 23s to first token, an
  // aborted preflight, and a speed reading of 0.61 tok/s that described the
  // collision rather than the machine.
  loadedId = model.id;

  onStage?.("Ready");
  return info;
}

/**
 * One constrained generation, which settles support and cost together.
 *
 * Accepting a schema is not the same as binding to it, so the reply has to be
 * JSON and nothing else for support to count. The rate it decodes at is the
 * grammar cost on this machine, which is the number the decision actually turns
 * on. llama.cpp compiles the schema to a GBNF grammar and evaluates it at every
 * token, so the cost is real; how large it is varies by machine and by schema,
 * which is exactly why it is measured here instead of assumed.
 *
 * @param {{ok:boolean, tokensPerSecond:number}} plain the unconstrained baseline
 */
export async function measureConstraint(plain, { streamFn = null } = {}) {
  const schema = {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  };
  const plainTps = plain?.ok ? plain.tokensPerSecond : 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  const began = performance.now();
  let firstAt = 0;
  let tokens = 0;
  let text = "";
  try {
    const source = streamFn
      ? streamFn({ schema })
      : chatStream({
          messages: [{ role: "user", content: 'Reply with {"ok":true}' }],
          maxTokens: 24,
          schema,
          signal: controller.signal,
        });
    for await (const piece of source) {
      if (piece && !firstAt) firstAt = performance.now();
      if (piece) tokens += 1;
      text += piece;
    }
  } catch {
    /* a failed probe means no measurement, which the decision below handles */
  } finally {
    clearTimeout(timer);
  }

  const trimmed = text.trim();
  let supported = false;
  try {
    supported = trimmed.startsWith("{") && JSON.parse(trimmed)?.ok !== undefined;
  } catch {
    supported = false;
  }

  const decodeMs = firstAt ? performance.now() - firstAt : 0;
  const grammarTps =
    tokens > 1 ? +((tokens - 1) / Math.max(decodeMs / 1000, 0.001)).toFixed(2) : 0;
  // Two decimals, not one: a ratio can land below 0.05 on a fast machine, and
  // rounding it to "0.0" throws away the only number that explains the verdict.
  const ratio = grammarTps > 0 && plainTps > 0 ? +(plainTps / grammarTps).toFixed(2) : null;

  if (!supported) {
    return { used: false, supported: false, plainTps, grammarTps, ratio, why: "the build did not bind the schema" };
  }

  // Worth it whenever a whole plan still decodes inside the harness's first
  // attempt with room to spare.
  const planMs = grammarTps > 0 ? (PLAN_TOKENS / grammarTps) * 1000 : Infinity;
  const ceiling = FIRST_ATTEMPT_MS * CONSTRAINT_BUDGET_SHARE;
  const used = planMs <= ceiling;

  return {
    used,
    supported: true,
    plainTps,
    grammarTps,
    ratio,
    why: used
      ? `a ${PLAN_TOKENS}-token plan decodes in about ${Math.round(planMs / 1000)}s with the grammar on`
      : `a ${PLAN_TOKENS}-token plan would take about ${Math.round(planMs / 1000)}s with the grammar on, past the ${Math.round(ceiling / 1000)}s this may spend`,
  };
}

/** One short generation, purely to time this machine. */
async function measureSpeed() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const began = performance.now();
  let firstAt = 0;
  let tokens = 0;
  try {
    for await (const piece of chatStream({
      messages: [{ role: "user", content: "Count: one two three four five six seven eight." }],
      maxTokens: 16,
      signal: controller.signal,
    })) {
      if (piece && !firstAt) firstAt = performance.now();
      if (piece) tokens += 1;
    }
  } catch {
    /* a failed probe just means we have no measurement */
  } finally {
    clearTimeout(timer);
  }
  if (!tokens) {
    return { ok: false, ttftMs: null, tokensPerSecond: 0 };
  }
  const decodeMs = performance.now() - firstAt;
  return {
    ok: true,
    ttftMs: Math.round(firstAt - began),
    tokensPerSecond: +(tokens > 1 ? (tokens - 1) / Math.max(decodeMs / 1000, 0.001) : 0).toFixed(2),
  };
}

export async function unloadModel() {
  await backend.unload();
  loadedId = null;
  info = null;
  speed = null;
  constraint = { used: false, supported: false, plainTps: 0, grammarTps: 0, ratio: null, why: "not measured" };
}

/**
 * Stream a chat completion as an async iterator of text pieces.
 *
 * Yielding rather than accumulating lets the harness measure the rate and
 * abandon a generation that cannot finish in budget.
 */
export async function* chatStream({
  messages,
  maxTokens = 220,
  temperature = 0.1,
  schema = null,
  signal,
  onThinking,
  // Same injection seam harness.js uses: it lets the queue below be tested
  // against fake slow streams without downloading a model.
  streamFn = null,
} = {}) {
  // Single-flight. Both backends hold one context, so two concurrent
  // generations corrupt each other's decoding. Rather than trust every caller
  // to sequence itself, later callers queue here and run when the current one
  // finishes.
  const ticket = generationQueue;
  let release;
  generationQueue = new Promise((resolve) => {
    release = resolve;
  });
  await ticket;

  try {
    const source = streamFn || backend.stream;
    yield* source({ messages, maxTokens, temperature, schema, signal, onThinking });
  } finally {
    release();
  }
}

/** Which backend a model would load on, without loading it. */
export function backendFor(model, hardware) {
  return (BACKENDS.find((b) => b.canRun(model, hardware)) || wllama).ID;
}
