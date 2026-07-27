/*
 * Cross-origin isolation for the Mini-Lab, scoped to this directory.
 *
 * Multi-threaded WebAssembly needs SharedArrayBuffer, which the browser only
 * grants to a cross-origin-isolated page. That requires COOP and COEP response
 * headers, and GitHub Pages cannot send them. This service worker re-serves
 * same-origin navigations with those headers attached.
 *
 * Two deliberate choices:
 *
 *   Scope. A worker's default scope is its own directory, and GitHub Pages
 *   cannot send Service-Worker-Allowed to widen it. Living at /mini-lab/ means
 *   only the Mini-Lab becomes isolated, so blog posts keep their YouTube
 *   embeds working.
 *
 *   credentialless, not require-corp. Under require-corp every cross-origin
 *   subresource must opt in with CORP, which the Hugging Face CDN does not
 *   send, so model downloads would break. credentialless sends those requests
 *   without credentials instead, which is what we want anyway.
 *
 * Written out rather than vendored so it can be read and audited in full.
 */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only the document itself needs these headers — COOP and COEP are
  // document-level, and isolation follows from the navigation response.
  //
  // Everything else is deliberately left alone. Re-wrapping a subresource
  // response through the worker breaks large streamed cross-origin downloads
  // in Firefox ("A ServiceWorker intercepted the request and encountered an
  // unexpected error"), which surfaced as a corrupt model and llama.cpp
  // reporting "Error in input stream". The multi-hundred-megabyte model fetch
  // must reach the network untouched.
  if (request.mode !== "navigate") return;

  let sameOrigin = false;
  try {
    sameOrigin = new URL(request.url).origin === self.location.origin;
  } catch {
    return;
  }
  if (!sameOrigin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 0 || response.type === "opaque") return response;

        const headers = new Headers(response.headers);
        headers.set("Cross-Origin-Embedder-Policy", "credentialless");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
      .catch(() => fetch(request))
  );
});
