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

  // Range requests and cache-only lookups must pass through untouched.
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Opaque responses have no readable body or headers to rewrite.
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
