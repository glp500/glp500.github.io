// wllama backend: llama.cpp compiled to WebAssembly, GGUF weights.
//
// The only backend with a CPU path, so it is the default and the fallback.
// v3.5.1 has the llama.cpp WebGPU backend compiled in: when `navigator.gpu`
// exists the layers really are offloaded, and when it does not, the same build
// decodes on CPU threads instead.
//
// wllama runs llama.cpp inside its own worker, so this module stays on the main
// thread and only brokers between the runtime façade and that worker.

import { gpuLayersFor } from "../hardware.js";

const BASE = "/assets/js/vendor/wllama/";

export const ID = "wllama";

let WllamaCtor = null;
let instance = null;

/** wllama signals a deliberate abort with its own error type and message. */
export function isAbort(error) {
  const name = error?.name || "";
  const message = String(error?.message || "");
  return (
    name === "AbortError" ||
    name === "WllamaAbortError" ||
    /abort/i.test(name) ||
    /operation aborted/i.test(message)
  );
}

/** This backend runs anywhere. It is the reason there is a CPU path at all. */
export function canRun() {
  return true;
}

async function getWllama() {
  if (!WllamaCtor) {
    const mod = await import(`${BASE}wllama.min.js`);
    WllamaCtor = mod.Wllama;
  }
  return WllamaCtor;
}

/**
 * @returns {{ctx:number, gpu:boolean, gpuLayers:number, device:string}} what the
 *   load actually did — not what was requested. The GPU row in the UI reads
 *   this, so it must describe reality.
 */
export async function load(model, hardware, { onProgress, onStage, signal } = {}) {
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
    n_ctx: model.context || 4096,
    n_gpu_layers: gpuLayersFor(hardware),
    warmup: true,
  };
  if (hardware.crossOriginIsolated && hardware.threads > 1) {
    params.n_threads = Math.min(hardware.threads, 8);
  }

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

  // Ask the build, do not infer from the hardware probe. A machine can report
  // WebGPU on the main thread and still decode on the CPU.
  const gpuCapable = typeof instance.isSupportWebGPU === "function" && instance.isSupportWebGPU();
  const gpu = gpuCapable && params.n_gpu_layers > 0;

  return {
    ctx: params.n_ctx,
    gpu,
    gpuLayers: gpu ? params.n_gpu_layers : 0,
    device: gpu ? hardware.gpuName || "WebGPU device" : `CPU · ${params.n_threads ?? 1} thread(s)`,
  };
}

export async function* stream({ messages, maxTokens, temperature, schema, signal, onThinking }) {
  if (!instance) throw new Error("No model is loaded.");

  const options = {
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
    abortSignal: signal,
    // Qwen3.x and other hybrid-reasoning models spend their whole token budget
    // on hidden thinking and emit no delta.content at all. Measured on
    // Qwen3.5-0.8B: 60 tokens of thinking and zero content in 43s, versus 5
    // tokens and a correct answer in 5.8s with thinking off. A larger budget
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

  let completion;
  try {
    completion = await instance.createChatCompletion(options);
  } catch (error) {
    // Aborting is how the harness enforces its deadline; it is an expected
    // outcome, not a failure to report.
    if (isAbort(error) || signal?.aborted) return;
    throw error;
  }

  // Take the iterator once: calling [Symbol.asyncIterator]() per loop would
  // restart the stream every tick.
  const iterator = completion[Symbol.asyncIterator]();

  for (;;) {
    let chunk;
    try {
      const step = await iterator.next();
      if (step.done) break;
      chunk = step.value;
    } catch (error) {
      if (isAbort(error) || signal?.aborted) return;
      throw error;
    }
    if (signal?.aborted) return;
    const delta = chunk?.choices?.[0]?.delta || {};
    const piece = delta.content || "";
    if (piece) {
      yield piece;
    } else if (Object.keys(delta).some((k) => k !== "role" && delta[k])) {
      // A model that ignores enable_thinking still burns tokens here. Report it
      // so progress does not read as a frozen page, and so the harness can tell
      // "thinking" apart from "produced nothing at all".
      onThinking?.();
    }
  }
}

export async function unload() {
  if (instance) {
    try {
      await instance.exit();
    } catch {
      /* already gone */
    }
  }
  instance = null;
}
