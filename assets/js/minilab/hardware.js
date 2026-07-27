// Hardware capability probe.
//
// Works out what this machine can actually run before anything is downloaded,
// so the model picker can recommend honestly and explain every exclusion.
// Everything here is read-only feature detection; nothing is fetched.

const GB = 1024 ** 3;

// A model needs materially more memory than its file size once the KV cache,
// compute buffers and runtime overhead are counted. Measured in practice at
// roughly 1.5-1.8x for Q4 GGUF at small context sizes.
const RUNTIME_OVERHEAD = 1.7;

// Browsers cap a single ArrayBuffer at 2 GB, which caps one GGUF file.
export const MAX_FILE_BYTES = 2 * GB;

export async function probeHardware() {
  const report = {
    webgpu: false,
    adapter: null,
    gpuName: "Unknown",
    gpuVendor: "",
    maxBufferBytes: 0,
    deviceMemoryGb: null,
    threads: navigator.hardwareConcurrency || 4,
    storageQuotaBytes: null,
    storageUsedBytes: null,
    crossOriginIsolated: Boolean(globalThis.crossOriginIsolated),
    budgetBytes: 0,
    tier: "cpu",
    notes: [],
  };

  if (!("gpu" in navigator)) {
    report.notes.push(
      "No WebGPU here, so models fall back to the CPU. Expect several seconds per reply."
    );
  } else {
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      });
      if (!adapter) {
        report.notes.push(
          "WebGPU is present but no GPU was granted — usually disabled or blocklisted."
        );
      } else {
        report.webgpu = true;
        report.adapter = adapter;
        // adapter.info is the current API; some builds still expose only
        // requestAdapterInfo(). Neither is guaranteed to be populated.
        let info = adapter.info;
        if (!info && typeof adapter.requestAdapterInfo === "function") {
          try {
            info = await adapter.requestAdapterInfo();
          } catch {
            info = null;
          }
        }
        if (info) {
          report.gpuVendor = info.vendor || "";
          report.gpuName =
            info.description || info.device || info.architecture || info.vendor || "WebGPU device";
        } else {
          report.gpuName = "WebGPU device";
          report.notes.push(
            "Your browser hides the GPU name, so the estimate uses buffer limits."
          );
        }
        report.maxBufferBytes = Math.min(
          adapter.limits?.maxBufferSize ?? 0,
          adapter.limits?.maxStorageBufferBindingSize ?? Number.MAX_SAFE_INTEGER
        );
      }
    } catch (error) {
      report.notes.push(`WebGPU probe failed: ${error.message}`);
    }
  }

  // navigator.deviceMemory is Chromium-only, coarse, and capped at 8.
  if (typeof navigator.deviceMemory === "number") {
    report.deviceMemoryGb = navigator.deviceMemory;
  }

  if (navigator.storage?.estimate) {
    try {
      const { quota, usage } = await navigator.storage.estimate();
      report.storageQuotaBytes = quota ?? null;
      report.storageUsedBytes = usage ?? null;
    } catch {
      /* storage estimate is advisory only */
    }
  }

  report.budgetBytes = computeBudget(report);
  report.tier = pickTier(report);

  if (!report.crossOriginIsolated) {
    report.notes.push(
      "CPU work runs single-threaded here. GPU offload is unaffected."
    );
  }

  return report;
}

// The usable budget is the tightest of three independent ceilings. Being
// conservative here is deliberate: a model that loads slowly is a worse
// outcome than one the user was told not to pick.
function computeBudget(report) {
  const ceilings = [];

  if (report.webgpu && report.maxBufferBytes > 0) {
    // A single weight tensor must fit one buffer, but total VRAM is typically
    // a multiple of the per-buffer cap. 4x is the conservative end of what
    // desktop and integrated GPUs report in practice.
    ceilings.push(report.maxBufferBytes * 4);
  }

  if (report.deviceMemoryGb) {
    // Never plan to use more than half of system memory.
    ceilings.push(report.deviceMemoryGb * GB * 0.5);
  }

  if (report.storageQuotaBytes) {
    const free = report.storageQuotaBytes - (report.storageUsedBytes || 0);
    ceilings.push(free * 0.8);
  }

  if (!ceilings.length) return 1.5 * GB; // nothing to go on; assume modest
  return Math.max(0, Math.min(...ceilings));
}

function pickTier(report) {
  if (!report.webgpu) return "cpu";
  const gb = report.budgetBytes / GB;
  if (gb >= 4.5) return "large";
  if (gb >= 2.4) return "standard";
  return "low";
}

/**
 * Decide whether one catalogue entry can run here, and say why not if it
 * cannot. The picker renders `reason` verbatim, so it must be specific.
 */
export function evaluateModel(model, report) {
  if (model.blocked_reason) {
    return { ok: false, reason: model.blocked_reason.trim() };
  }
  if (model.size_bytes > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `${formatBytes(model.size_bytes)} exceeds the ${formatBytes(
        MAX_FILE_BYTES
      )} single-file limit browsers place on model downloads.`,
    };
  }

  const needBytes = model.size_bytes * RUNTIME_OVERHEAD;
  if (report.budgetBytes && needBytes > report.budgetBytes) {
    return {
      ok: false,
      reason: `Needs about ${formatBytes(needBytes)} of working memory; this device has room for roughly ${formatBytes(
        report.budgetBytes
      )}.`,
    };
  }

  // Deliberately no per-model note about missing WebGPU: it would be the same
  // sentence on every row. The hardware panel states it once.
  return { ok: true };
}

/**
 * Best runnable model for this machine.
 *
 * Without a GPU the smallest model is the right default, not the catalogue's:
 * on one or two CPU threads the difference between 0.5 GB and 1.3 GB is the
 * difference between a usable wait and one nobody sits through.
 */
export function recommendModel(models, report) {
  const runnable = models.filter((m) => evaluateModel(m, report).ok);
  if (!runnable.length) return null;
  if (!report.webgpu) {
    return runnable.reduce((a, b) => (b.size_bytes < a.size_bytes ? b : a));
  }
  const preferred = runnable.find((m) => m.default);
  if (preferred) return preferred;
  return runnable.reduce((a, b) => (b.size_bytes > a.size_bytes ? b : a));
}

/** How many layers to push to the GPU. 999 means "all of them". */
export function gpuLayersFor(report) {
  return report.webgpu ? 999 : 0;
}

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return "unknown";
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < GB) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${(bytes / GB).toFixed(2)} GB`;
}
