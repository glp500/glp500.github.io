// Hugging Face lookup for GGUF repositories.
//
// Uses only the public, key-free API. Every candidate is resolved to a real
// file with a real byte size before it is offered, because the picker's whole
// job is to never suggest something that cannot load.

import { MAX_FILE_BYTES } from "./hardware.js";

const API = "https://huggingface.co/api";

// Preference order when a repo ships many quants. Q4_K_M is the usual
// quality/size sweet spot for small models.
const QUANT_ORDER = ["Q4_K_M", "UD-Q4_K_XL", "Q4_K_S", "IQ4_XS", "Q5_K_M", "Q3_K_M", "Q8_0"];

export async function searchRepos(query, { limit = 12, signal } = {}) {
  const url = `${API}/models?search=${encodeURIComponent(query)}&filter=gguf&sort=downloads&direction=-1&limit=${limit}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Hugging Face search failed (${response.status}).`);
  const rows = await response.json();
  return rows.map((row) => ({
    repo: row.id ?? row.modelId,
    downloads: row.downloads ?? 0,
    updated: row.lastModified ?? "",
  }));
}

/**
 * List the loadable GGUF files in a repo, smallest first, with real sizes.
 * Multi-part files are excluded: wllama can load split models, but only when
 * given the first shard, and detecting that reliably needs more than a name.
 */
export async function listModelFiles(repo, { signal } = {}) {
  const response = await fetch(`${API}/models/${repo}?blobs=true`, { signal });
  if (response.status === 404) throw new Error(`No such repository: ${repo}`);
  if (response.status === 401 || response.status === 403) {
    throw new Error(`${repo} is gated or private, so it cannot be loaded without a token.`);
  }
  if (!response.ok) throw new Error(`Could not read ${repo} (${response.status}).`);

  const data = await response.json();
  const files = (data.siblings || [])
    .filter((f) => f.rfilename.toLowerCase().endsWith(".gguf"))
    .filter((f) => !/mmproj|\bmtp\b|of-0\d/i.test(f.rfilename))
    .map((f) => ({ file: f.rfilename, size_bytes: f.size ?? 0 }))
    .filter((f) => f.size_bytes > 0);

  files.sort((a, b) => a.size_bytes - b.size_bytes);
  return files;
}

/** Pick the best file in a repo that fits both the file cap and the budget. */
export function chooseFile(files, budgetBytes) {
  const loadable = files.filter(
    (f) => f.size_bytes <= MAX_FILE_BYTES && (!budgetBytes || f.size_bytes * 1.7 <= budgetBytes)
  );
  if (!loadable.length) return null;

  for (const quant of QUANT_ORDER) {
    const match = loadable.find((f) => f.file.includes(quant));
    if (match) return match;
  }
  // Otherwise take the largest that still fits — more bits, same constraints.
  return loadable[loadable.length - 1];
}

/** Turn a repo id into a catalogue-shaped entry the picker and runtime accept. */
export async function resolveRepo(repo, budgetBytes, { signal } = {}) {
  const clean = repo.trim().replace(/^https?:\/\/huggingface\.co\//, "").replace(/\/+$/, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(clean)) {
    throw new Error(`"${repo}" is not a repository id. Use the owner/name form, e.g. unsloth/Qwen3.5-2B-GGUF.`);
  }

  const files = await listModelFiles(clean, { signal });
  if (!files.length) throw new Error(`${clean} has no single-file GGUF weights.`);

  const chosen = chooseFile(files, budgetBytes);
  if (!chosen) {
    const smallest = files[0];
    throw new Error(
      `The smallest weights in ${clean} are ${(smallest.size_bytes / 1024 ** 3).toFixed(2)} GB, which is too large for this browser or device.`
    );
  }

  return {
    id: `hf:${clean}:${chosen.file}`,
    label: clean.split("/")[1] || clean,
    repo: clean,
    file: chosen.file,
    size_bytes: chosen.size_bytes,
    context: 4096,
    tier: "custom",
    note: `From Hugging Face · ${clean}`,
  };
}
