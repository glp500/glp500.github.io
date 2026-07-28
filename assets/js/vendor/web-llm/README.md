# Vendored dependency

[web-llm](https://github.com/mlc-ai/web-llm) v0.2.84, MLC's WebGPU inference
engine, used as the GPU backend in `minilab/backends/webllm.js`. Licensed
Apache-2.0.

`web-llm.min.js` is the self-contained ESM bundle from
`https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm`.

It is **only** imported when `navigator.gpu` exists. web-llm is WebGPU-only and
has no CPU path. On a browser without WebGPU (which includes Firefox on Linux as
of 2026) this 6 MB file is never fetched, and `wllama` handles everything.

Models are MLC-compiled, not GGUF, so they come from web-llm's own
`prebuiltAppConfig.model_list` rather than from `_data/minilab-models.yml`.
