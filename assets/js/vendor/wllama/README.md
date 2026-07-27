# Vendored dependency

[wllama](https://github.com/ngxson/wllama) v3.5.1 — WebAssembly bindings for
[llama.cpp](https://github.com/ggml-org/llama.cpp) with WebGPU offload.
Licensed MIT (per `package.json` in the npm tarball; the upstream repository
does not publish a root LICENSE file).

Vendored rather than loaded from a CDN so the Mini-Lab cannot be broken by a
third-party outage and so cross-origin isolation stays predictable.

Files are the unmodified `esm/index.min.js` and `esm/wasm/wllama.wasm` from the
npm tarball. To update: bump the version, re-copy both files, re-run the
Mini-Lab verification.
