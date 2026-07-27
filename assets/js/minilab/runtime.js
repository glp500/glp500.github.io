// Model runtime: download, cache, load, and stream from a GGUF model.
//
// wllama runs llama.cpp inside its own worker, so this module stays on the
// main thread and only brokers between the UI and that worker.

import { gpuLayersFor } from "./hardware.js";
import { record } from "./diagnostics.js";

const BASE = "/assets/js/vendor/wllama/";

// Planning needs a couple of hundred tokens, not thousands. A smaller context
// means a smaller KV cache and less memory traffic per token, which matters a
// great deal when there is no GPU to hide it.
const PLANNING_CTX = 2048;

let WllamaCtor = null;
let instance = null;
let loadedId = null;
let constraintWorks = false;
let constraintAffordable = false;

async function getWllama() {
  if (!WllamaCtor) {
    const mod = await import(`${BASE}wllama.min.js`);
    WllamaCtor = mod.Wllama;
  }
  return WllamaCtor;
}

export function loadedModelId() {
  return loadedId;
}

/**
 * Whether to constrain decoding to a JSON schema.
 *
 * Supported is not the same as worth it. llama.cpp compiles the schema into a
 * grammar and evaluates it at every token; measured on a CPU-only machine that
 * cost roughly 15x per token (0.15 tok/s against 2.5 tok/s for a trivial
 * schema), which is the difference between answering and timing out. The
 * validator in analysis.js is the real guarantee either way, so the constraint
 * is used only where the GPU can absorb its cost.
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
  const { onProgress, onStage, signal } = handlers;

  if (loadedId === model.id) return instance;
  await unloadModel();

  onStage?.("Preparing runtime");
  const Wllama = await getWllama();

  instance = new Wllama(
    { default: `${BASE}wllama.wasm` },
    { parallelDownloads: 3, allowOffline: true, suppressNativeLog: true }
  );

  // Only pass n_threads when isolation actually succeeded. Passing 1 does not
  // mean "let the runtime decide" — it *enforces* single-threaded inference,
  // which is what was throttling this page to one core.
  const params = {
    n_ctx: Math.min(model.context || PLANNING_CTX, PLANNING_CTX),
    n_gpu_layers: gpuLayersFor(hardware),
    warmup: true,
  };
  if (hardware.crossOriginIsolated && hardware.threads > 1) {
    params.n_threads = Math.min(hardware.threads, 8);
  }

  record("model.load.start", {
    model: model.id,
    threads: params.n_threads ?? "auto",
    gpuLayers: params.n_gpu_layers,
    ctx: params.n_ctx,
    bytes: model.size_bytes,
  });

  const began = performance.now();
  onStage?.("Downloading model");
  await instance.loadModelFromHF(
    { repo: model.repo, file: model.file },
    {
      useCache: true,
      signal,
      progressCallback: ({ loaded, total }) => onProgress?.({ loaded, total }),
      ...params,
    }
  );

  loadedId = model.id;
  record("model.load.done", { model: model.id, ms: Math.round(performance.now() - began) });

  constraintAffordable = Boolean(hardware.webgpu);
  if (constraintAffordable) {
    onStage?.("Checking output constraints");
    constraintWorks = await probeConstraint();
  } else {
    constraintWorks = false;
  }
  record("model.constraint", {
    supported: constraintWorks,
    used: supportsConstraint(),
    why: constraintAffordable ? "gpu present" : "skipped: too slow without a GPU",
  });

  onStage?.("Ready");
  return instance;
}

/**
 * Ask for one tiny constrained generation and see whether the build honours
 * it. llama.cpp supports GBNF and json_schema, and wllama forwards the whole
 * options object through to it — but that is not the same as this WASM build
 * implementing it, so we measure instead of assuming.
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

export async function unloadModel() {
  if (instance) {
    try {
      await instance.exit();
    } catch {
      /* already gone */
    }
  }
  instance = null;
  loadedId = null;
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
} = {}) {
  if (!instance) throw new Error("No model is loaded.");

  const options = {
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
    abortSignal: signal,
    // Qwen3.x and other hybrid-reasoning models spend their whole token
    // budget on hidden thinking and emit no delta.content at all. Measured on
    // Qwen3.5-0.8B: 60 tokens of thinking and zero content in 43s, versus
    // 5 tokens and a correct answer in 5.8s with thinking off. A larger budget
    // only buys more thinking. The Mini-Lab wants a small JSON plan, not a
    // chain of thought, so thinking is disabled.
    chat_template_kwargs: { enable_thinking: false },
    // Reuse the evaluated system prompt across attempts. On CPU the prompt is
    // the dominant cost, so re-evaluating it for a repair turn is pure waste.
    cache_prompt: true,
  };

  // Forwarded verbatim to llama.cpp. Harmless if this build ignores it.
  if (schema) {
    options.response_format = {
      type: "json_schema",
      json_schema: { name: "plan", schema, strict: true },
    };
  }

  const stream = await instance.createChatCompletion(options);
  for await (const chunk of stream) {
    if (signal?.aborted) return;
    const delta = chunk?.choices?.[0]?.delta || {};
    const piece = delta.content || "";
    if (piece) {
      yield piece;
    } else if (Object.keys(delta).some((k) => k !== "role" && delta[k])) {
      // A model that ignores enable_thinking still burns tokens here. Report
      // it so progress does not read as a frozen page, and so the harness can
      // tell "thinking" apart from "produced nothing at all".
      onThinking?.();
    }
  }
}

/** Convenience wrapper for callers that just want the whole string. */
export async function chat(messages, { onToken, signal, maxTokens = 220, temperature = 0.1 } = {}) {
  let text = "";
  for await (const piece of chatStream({ messages, maxTokens, temperature, signal })) {
    text += piece;
    onToken?.(piece, text);
  }
  return text;
}
