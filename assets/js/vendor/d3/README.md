# Vendored dependency

[D3](https://d3js.org) v7.9.0, the chart primitives behind `minilab/charts.js`
(scales, axes, binning, shapes, colour interpolation). Licensed ISC.

Vendored rather than loaded from a CDN, same reasoning as `../wllama/`: the
Mini-Lab must not break on a third-party outage, and cross-origin isolation
stays predictable.

`d3.min.js` is the **self-contained** ESM bundle from
`https://esm.sh/d3@7.9.0/es2022/d3.bundle.mjs`. This matters: the more obvious
`https://cdn.jsdelivr.net/npm/d3@7/+esm` is a 1.5 KB shim that re-exports thirty
separate CDN URLs, so vendoring it would still fetch d3 from the network at
runtime. Check before updating:

    grep -oE '(from|import)"[^"]+"' d3.min.js | grep -v '^.*"\.'

Anything printed is an external import and the file is the wrong one.
