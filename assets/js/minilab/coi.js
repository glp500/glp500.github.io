// Registers the cross-origin isolation service worker and reports the result.
//
// Isolation is what unlocks multi-threaded WebAssembly, which is the single
// largest throughput factor on a machine without WebGPU. Applying it requires
// one reload, because the headers only take effect on a navigation the worker
// has intercepted.

const SW_URL = "/mini-lab/coi-serviceworker.js";
const RELOAD_FLAG = "minilab-coi-reloaded";

/**
 * @returns {Promise<{isolated: boolean, state: string, detail: string}>}
 *   state is one of: active | reloading | unsupported | insecure | failed | disabled
 */
export async function ensureIsolation({ onReload } = {}) {
  if (globalThis.crossOriginIsolated) {
    return { isolated: true, state: "active", detail: "Multi-threaded WebAssembly is available." };
  }

  if (!("serviceWorker" in navigator)) {
    return {
      isolated: false,
      state: "unsupported",
      detail: "This browser has no service workers, so threads stay disabled.",
    };
  }

  if (!globalThis.isSecureContext) {
    return {
      isolated: false,
      state: "insecure",
      detail: "Threads need a secure context (https or localhost).",
    };
  }

  // Only ever reload once per tab. Without this guard a browser that refuses
  // isolation would reload forever.
  if (sessionStorage.getItem(RELOAD_FLAG)) {
    return {
      isolated: false,
      state: "failed",
      detail: "Isolation did not take effect, so inference runs on one thread.",
    };
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/mini-lab/" });
    await navigator.serviceWorker.ready;

    // A worker that was just installed is not controlling this page yet; the
    // headers only appear after a navigation it can intercept.
    if (!navigator.serviceWorker.controller) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      onReload?.();
      // Give the caller a moment to show why the page is about to reload.
      setTimeout(() => window.location.reload(), 700);
      return {
        isolated: false,
        state: "reloading",
        detail: "Turning on multi-threading. The page reloads once.",
      };
    }

    await registration.update().catch(() => {});
    return {
      isolated: Boolean(globalThis.crossOriginIsolated),
      state: globalThis.crossOriginIsolated ? "active" : "failed",
      detail: globalThis.crossOriginIsolated
        ? "Multi-threaded WebAssembly is available."
        : "Isolation did not take effect, so inference runs on one thread.",
    };
  } catch (error) {
    return {
      isolated: false,
      state: "failed",
      detail: `Could not enable threads: ${error.message}`,
    };
  }
}
