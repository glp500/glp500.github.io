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

// Below this, constraining decoding to a grammar is the difference between
// answering and timing out: llama.cpp evaluates the schema at every token, and
// that measured roughly 15x per token on a CPU-only machine.
const CONSTRAINT_MIN_TPS = 8;

let backend = wllama;
let loadedId = null;
let loadedCtx = PLANNING_CTX;
let info = null;
let speed = null;
let constraintWorks = false;
let constraintAffordable = false;
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
 * Supported is not the same as worth it, and the deciding number is the machine's
 * measured decode rate rather than whether a GPU was detected — a WebGPU adapter
 * that ends up decoding on the CPU must not be charged the grammar's cost. The
 * validator in analysis.js is the real guarantee either way.
 */
export function supportsConstraint() {
  return constraintWorks && constraintAffordable;
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

  constraintAffordable = Boolean(speed?.ok) && speed.tokensPerSecond >= CONSTRAINT_MIN_TPS;
  if (constraintAffordable) {
    onStage?.("Checking output constraints");
    constraintWorks = await probeConstraint();
  } else {
    constraintWorks = false;
  }
  record("model.constraint", {
    supported: constraintWorks,
    used: supportsConstraint(),
    why: constraintAffordable
      ? `${speed.tokensPerSecond} tok/s is enough to pay for a grammar`
      : `skipped: ${speed?.tokensPerSecond ?? 0} tok/s is below ${CONSTRAINT_MIN_TPS}`,
  });

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
 * Ask for one tiny constrained generation and see whether the build honours it.
 * Both backends accept a schema, but accepting it is not the same as binding to
 * it, so we measure instead of assuming.
 */
async function probeConstraint() {
  const schema = {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    let text = "";
    for await (const piece of chatStream({
      messages: [{ role: "user", content: 'Reply with {"ok":true}' }],
      maxTokens: 24,
      schema,
      signal: controller.signal,
    })) {
      text += piece;
    }
    const trimmed = text.trim();
    // If the constraint bound, the reply is JSON and nothing else.
    return trimmed.startsWith("{") && JSON.parse(trimmed)?.ok !== undefined;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
  constraintWorks = false;
  constraintAffordable = false;
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
