// web-llm backend: MLC's WebGPU inference engine.
//
// WebGPU-only — there is no CPU path here at all, which is why wllama remains
// the default and this backend is only ever selected when `navigator.gpu`
// exists. On Firefox/Linux (still no WebGPU as of 2026) this file's 6 MB bundle
// is never even fetched.
//
// Weights are MLC-compiled and sharded, not GGUF, so the models come from
// web-llm's own prebuilt list rather than from _data/minilab-models.yml.

const BASE = "/assets/js/vendor/web-llm/";

export const ID = "webllm";

let lib = null;
let engine = null;
let engineModelId = null;

async function getLib() {
  if (!lib) lib = await import(`${BASE}web-llm.min.js`);
  return lib;
}

/** WebGPU is not optional here, and the model must be an MLC build. */
export function canRun(model, hardware) {
  return Boolean(hardware?.webgpu) && model?.backend === ID;
}

/**
 * The prebuilt MLC models, mapped into the same catalogue shape the GGUF
 * entries use, so hardware.js and the model picker need no special case.
 *
 * Only called when WebGPU is present — see canRun.
 */
export async function catalogue() {
  const { prebuiltAppConfig } = await getLib();
  return (prebuiltAppConfig?.model_list || [])
    .filter((m) => m.model_id && m.vram_required_MB)
    .map((m) => ({
      id: m.model_id,
      label: m.model_id.replace(/-MLC$/, "").replace(/-/g, " "),
      backend: ID,
      // vram_required_MB is a runtime requirement rather than a file size, so
      // hardware.js's 1.7x overhead lands on the conservative side here. That
      // is the intended direction: refusing a model that would crawl beats
      // recommending it.
      size_bytes: m.vram_required_MB * 1024 * 1024,
      context: m.overrides?.context_window_size || 4096,
      note: m.low_resource_required ? "Runs on modest GPUs." : "",
    }));
}

export async function load(model, hardware, { onProgress, onStage, signal } = {}) {
  const { CreateMLCEngine } = await getLib();
  onStage?.("Downloading model");

  // ponytail: main-thread engine rather than CreateWebWorkerMLCEngine — it
  // needs no separate worker file and GPU compute does not block JS the way
  // WASM CPU decode does. Move to a worker if the UI ever stutters mid-decode.
  engine = await CreateMLCEngine(model.id, {
    initProgressCallback: ({ progress, text }) => {
      if (text) onStage?.(text);
      const total = model.size_bytes || 1;
      onProgress?.({ loaded: Math.round((progress || 0) * total), total });
    },
  });
  engineModelId = model.id;

  if (signal?.aborted) {
    await unload();
    throw new DOMException("Aborted", "AbortError");
  }

  return {
    ctx: model.context || 4096,
    gpu: true, // the engine cannot start without WebGPU
    gpuLayers: -1, // MLC does not expose a layer count; all of it is on the GPU
    device: hardware.gpuName || "WebGPU device",
  };
}

export async function* stream({ messages, maxTokens, temperature, schema, signal, onThinking }) {
  if (!engine) throw new Error("No model is loaded.");

  const options = {
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
  };

  // XGrammar compiles the schema into a token mask on the GPU, where the cost
  // is affordable — unlike the CPU path, which is why this is unconditional
  // here and measured before use in wllama.
  if (schema) {
    options.response_format = { type: "json_object", schema: JSON.stringify(schema) };
  }

  // web-llm has no AbortSignal; interruptGenerate() is how a run is stopped.
  const onAbort = () => {
    try {
      engine.interruptGenerate();
    } catch {
      /* nothing in flight */
    }
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const chunks = await engine.chat.completions.create(options);
    for await (const chunk of chunks) {
      if (signal?.aborted) return;
      const delta = chunk?.choices?.[0]?.delta || {};
      const piece = delta.content || "";
      if (piece) yield piece;
      else if (Object.keys(delta).some((k) => k !== "role" && delta[k])) onThinking?.();
    }
  } catch (error) {
    if (signal?.aborted || /abort|interrupt/i.test(String(error?.message || ""))) return;
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function unload() {
  if (engine) {
    try {
      await engine.unload();
    } catch {
      /* already gone */
    }
  }
  engine = null;
  engineModelId = null;
}

export function loadedId() {
  return engineModelId;
}
