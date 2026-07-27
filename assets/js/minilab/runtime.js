// Model runtime: download, cache, load and stream from a GGUF model.
//
// wllama already runs llama.cpp inside its own worker, so this module stays on
// the main thread and only brokers between the UI and that worker.

import { gpuLayersFor } from "./hardware.js";

const BASE = "/assets/js/vendor/wllama/";

let WllamaCtor = null;
let instance = null;
let loadedId = null;

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
    {
      parallelDownloads: 3,
      allowOffline: true,
      suppressNativeLog: true,
    }
  );

  onStage?.("Downloading model");
  await instance.loadModelFromHF(
    { repo: model.repo, file: model.file },
    {
      useCache: true,
      signal,
      progressCallback: ({ loaded, total }) => onProgress?.({ loaded, total }),
      n_ctx: model.context || 4096,
      n_gpu_layers: gpuLayersFor(hardware),
      n_threads: hardware.crossOriginIsolated ? Math.min(hardware.threads, 8) : 1,
      // A short warmup pass makes the first real reply feel much faster.
      warmup: true,
    }
  );

  loadedId = model.id;
  onStage?.("Ready");
  return instance;
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
}

/**
 * Stream a chat completion. Calls onToken with each new piece of text and
 * resolves with the full string.
 */
export async function chat(messages, { onToken, signal, maxTokens = 512, temperature = 0.7 } = {}) {
  if (!instance) throw new Error("No model is loaded.");

  let text = "";
  const stream = await instance.createChatCompletion({
    messages,
    stream: true,
    max_tokens: maxTokens,
    temperature,
    abortSignal: signal,
  });

  for await (const chunk of stream) {
    const piece = chunk?.choices?.[0]?.delta?.content || "";
    if (!piece) continue;
    text += piece;
    onToken?.(piece, text);
  }
  return text;
}

/**
 * Ask the model for JSON matching a shape, and parse it defensively.
 * Small models wander outside the format, so this retries once with the
 * parse error fed back before giving up.
 */
export async function chatJSON(messages, { signal, maxTokens = 700 } = {}) {
  const attempt = async (extra) => {
    const raw = await chat(extra ? [...messages, ...extra] : messages, {
      signal,
      maxTokens,
      temperature: 0.1,
    });
    return { raw, parsed: extractJSON(raw) };
  };

  let { raw, parsed } = await attempt();
  if (parsed) return parsed;

  ({ raw, parsed } = await attempt([
    { role: "assistant", content: raw },
    {
      role: "user",
      content:
        "That was not valid JSON. Reply with the JSON object only — no prose, no code fences.",
    },
  ]));
  return parsed;
}

/** Pull the first balanced JSON object out of a model reply. */
export function extractJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "");
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
    if (ch === "}") {
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
