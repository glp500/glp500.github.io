// Chart rendering.
//
// Charts are described by a plain spec object and drawn as inline SVG. The spec
// is the single source of truth: the control panel edits it, this file draws it,
// and export.js turns the same object into matplotlib. That is what keeps the
// exported code matching the picture on screen.
//
// Dependency-free on purpose. A charting library would be a megabyte of download
// on a page that already asks the visitor for half a gigabyte of model weights.
//
// Mark specs, spacers and label rules follow the data-viz method; the palette is
// validated rather than chosen (see palette.js).

import { theme, seriesColor, sequentialColor, divergingColor, ALL_PAIRS_SERIES_CAP } from "./palette.js";

const PAD = { top: 22, right: 20, bottom: 56, left: 66 };
const BAR_MAX = 24; // never fill the slot; the leftover band is air
const SURFACE_GAP = 2; // white doing the separating
const DOT_R = 4.5; // >= 8px mark
const RING = 2;

/** A spec with every field defaulted, so partial specs are always renderable. */
export function normaliseSpec(spec = {}) {
  return {
    id: spec.id || `chart-${Math.random().toString(36).slice(2, 8)}`,
    type: spec.type || "histogram", // histogram | bar | scatter | line | heatmap
    x: spec.x || null,
    y: spec.y || null,
    colorBy: spec.colorBy || null,
    palette: spec.palette || "sequential",
    mode: spec.mode || "light",
    title: spec.title ?? "",
    xLabel: spec.xLabel ?? null,
    yLabel: spec.yLabel ?? null,
    caption: spec.caption ?? "",
    bins: spec.bins || 20,
    sort: spec.sort || "value-desc", // value-desc | value-asc | label | none
    scaleY: spec.scaleY || "linear", // linear | log
    valueLabels: spec.valueLabels ?? false,
    legend: spec.legend ?? "top", // top | right | none
    grid: spec.grid ?? "y", // none | y | both
    height: spec.height || 320,
    maxCategories: spec.maxCategories || 12,
    numberFormat: spec.numberFormat || "auto", // auto | integer | 1dp | percent
    matrix: spec.matrix || null, // heatmap payload, computed not generated
  };
}

/**
 * Render a spec to SVG plus the data table that accompanies it.
 * @returns {{svg: string, table: {columns: string[], rows: Array}, warning?: string}}
 */
export function renderChart(rawSpec, table) {
  const spec = normaliseSpec(rawSpec);
  const t = theme(spec.mode);

  // One chart failing must not take out the others. Without this a single bad
  // spec threw out of the render loop and silently dropped every chart after
  // it — the page looked like it had simply produced fewer results.
  try {
    switch (spec.type) {
      case "bar":
        return barChart(spec, table, t);
      case "scatter":
        return scatterChart(spec, table, t);
      case "line":
        return lineChart(spec, table, t);
      case "heatmap":
        return heatmapChart(spec, table, t);
      case "histogram":
      default:
        return histogramChart(spec, table, t);
    }
  } catch (error) {
    return { ...empty(spec, t, `This chart could not be drawn: ${error.message}`), error };
  }
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function numbers(table, name) {
  return table.rows
    .map((r) => Number.parseFloat(String(r[name]).replace(/[\s,_]/g, "")))
    .filter(Number.isFinite);
}

function pairs(table, xName, yName) {
  const out = [];
  for (const row of table.rows) {
    const x = Number.parseFloat(String(row[xName]).replace(/[\s,_]/g, ""));
    const y = Number.parseFloat(String(row[yName]).replace(/[\s,_]/g, ""));
    if (Number.isFinite(x) && Number.isFinite(y)) out.push([x, y, row]);
  }
  return out;
}

function counts(table, name, limit) {
  const map = new Map();
  for (const row of table.rows) {
    const v = String(row[name] ?? "").trim();
    if (v) map.set(v, (map.get(v) || 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).slice(0, limit * 3);
}

function sortRows(rows, sort) {
  const copy = [...rows];
  if (sort === "value-desc") copy.sort((a, b) => b.count - a.count);
  else if (sort === "value-asc") copy.sort((a, b) => a.count - b.count);
  else if (sort === "label") copy.sort((a, b) => a.label.localeCompare(b.label));
  return copy;
}

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

function linearScale(min, max, size) {
  const span = max - min || 1;
  return (v) => ((v - min) / span) * size;
}

function logScale(min, max, size) {
  const lo = Math.log10(Math.max(min, 1e-9));
  const hi = Math.log10(Math.max(max, 1e-9));
  const span = hi - lo || 1;
  return (v) => ((Math.log10(Math.max(v, 1e-9)) - lo) / span) * size;
}

function makeScale(spec, min, max, size) {
  return spec.scaleY === "log" && min > 0 ? logScale(min, max, size) : linearScale(min, max, size);
}

function ticks(min, max, count = 5) {
  const out = [];
  for (let i = 0; i <= count; i += 1) out.push(min + ((max - min) * i) / count);
  return out;
}

/**
 * Round axis bounds outward to human numbers, with headroom.
 *
 * Dividing the raw range into five gives ticks like 0.00, 3.8, 7.5, 11, 15 and
 * bars that touch the top of the frame. Readers parse round numbers instantly
 * and ragged ones not at all, so the axis is snapped to a 1/2/5 x 10^n step.
 */
function niceScaleBounds(min, max, targetTicks = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return { lo: min || 0, hi: (max || 0) + 1, step: 1 };
  }
  const rawStep = (max - min) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(rawStep) || 1));
  const normalised = rawStep / magnitude;
  const nice = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  const step = nice * magnitude;
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}

/** Tick values on a nice scale, so labels read as round numbers. */
function niceTicks(lo, hi, step) {
  const out = [];
  // Guard against a pathological step producing an unbounded loop.
  const n = Math.min(24, Math.round((hi - lo) / step));
  for (let i = 0; i <= n; i += 1) out.push(lo + i * step);
  return out;
}

// ---------------------------------------------------------------------------
// Chrome: frame, grid, axes, legend
// ---------------------------------------------------------------------------

function chrome(spec, t, { xLabel, yLabel, yTicks = [], plotW, plotH, xTicks = [] }) {
  const gridLines =
    spec.grid === "none"
      ? ""
      : yTicks
          .map(
            ({ y }) =>
              // Hairline, solid, recessive — never dashed.
              `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${PAD.left + plotW}" y2="${y.toFixed(
                1
              )}" stroke="${t.grid}" stroke-width="1"></line>`
          )
          .join("");

  const yLabels = yTicks
    .map(
      ({ y, label }) =>
        `<text x="${PAD.left - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${
          t.text.secondary
        }">${escapeText(label)}</text>`
    )
    .join("");

  const xLabels = xTicks
    .map(
      ({ x, label, rotate }) =>
        `<text x="${x.toFixed(1)}" y="${PAD.top + plotH + 18}" text-anchor="${
          rotate ? "end" : "middle"
        }" font-size="11" fill="${t.text.secondary}"${
          rotate ? ` transform="rotate(-35 ${x.toFixed(1)} ${PAD.top + plotH + 18})"` : ""
        }>${escapeText(label)}</text>`
    )
    .join("");

  const axisTitleY = yLabel
    ? `<text x="16" y="${PAD.top + plotH / 2}" text-anchor="middle" font-size="11" fill="${
        t.text.muted
      }" transform="rotate(-90 16 ${PAD.top + plotH / 2})">${escapeText(yLabel)}</text>`
    : "";
  const axisTitleX = xLabel
    ? `<text x="${PAD.left + plotW / 2}" y="${PAD.top + plotH + 46}" text-anchor="middle" font-size="11" fill="${
        t.text.muted
      }">${escapeText(xLabel)}</text>`
    : "";

  return { gridLines, yLabels, xLabels, axisTitleY, axisTitleX };
}

function legendMarkup(entries, t) {
  if (!entries.length) return "";
  return `<div class="viz-legend">${entries
    .map(
      (e) =>
        `<span class="viz-legend__item"><span class="viz-legend__swatch" style="background:${e.color}"></span>${escapeText(
          e.label
        )}</span>`
    )
    .join("")}</div>`;
}

function wrap(spec, t, inner, legend, warning) {
  const w = 680;
  const h = spec.height;
  return `<figure class="viz" data-chart-id="${spec.id}" style="--viz-surface:${t.surface};--viz-text:${t.text.primary}">
  ${spec.title ? `<figcaption class="viz__title">${escapeText(spec.title)}</figcaption>` : ""}
  ${legend || ""}
  <svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet"
       aria-label="${escapeAttr(spec.title || spec.type)}">
    <rect x="0" y="0" width="${w}" height="${h}" fill="${t.surface}"></rect>
    ${inner}
  </svg>
  ${warning ? `<p class="viz__warning">${escapeText(warning)}</p>` : ""}
  ${spec.caption ? `<p class="viz__caption">${escapeText(spec.caption)}</p>` : ""}
</figure>`;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function histogramChart(spec, table, t) {
  const values = numbers(table, spec.x);
  if (values.length < 2) return empty(spec, t, "Not enough numeric values to plot.");

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return empty(spec, t, `Every value of ${spec.x} is ${fmt(min, spec)}.`);

  const binCount = Math.max(3, Math.min(50, spec.bins));
  const width = (max - min) / binCount;
  const bins = new Array(binCount).fill(0);
  values.forEach((v) => {
    bins[Math.min(binCount - 1, Math.floor((v - min) / width))] += 1;
  });

  const plotW = 680 - PAD.left - PAD.right;
  const plotH = spec.height - PAD.top - PAD.bottom;
  const peak = Math.max(...bins);
  const nice = niceScaleBounds(0, peak, 4);
  const yTop = spec.scaleY === "log" ? peak : nice.hi;
  const yScale = makeScale(spec, spec.scaleY === "log" ? 1 : 0, yTop, plotH);
  const slot = plotW / binCount;
  const barW = Math.min(BAR_MAX, slot - SURFACE_GAP);

  const yTickVals = spec.scaleY === "log" ? ticks(0, peak, 4) : niceTicks(0, nice.hi, nice.step);
  const yTicks = yTickVals.map((v) => ({ y: PAD.top + plotH - yScale(v), label: fmt(v, spec) }));
  const xTicks = ticks(min, max, 5).map((v) => ({
    x: PAD.left + linearScale(min, max, plotW)(v),
    label: fmt(v, spec),
  }));

  const c = chrome(spec, t, { xLabel: spec.xLabel ?? spec.x, yLabel: spec.yLabel ?? "Rows", yTicks, xTicks, plotW, plotH });

  const marks = bins
    .map((count, i) => {
      const h = yScale(count);
      if (h <= 0) return "";
      const x = PAD.left + i * slot + (slot - barW) / 2;
      const y = PAD.top + plotH - h;
      const fill = spec.palette === "categorical" ? seriesColor(0, spec.mode) : sequentialColor(count / peak, spec.mode);
      const lo = min + i * width;
      return `${roundedBar(x, y, barW, h, fill)}<title>${fmt(lo, spec)} to ${fmt(lo + width, spec)}: ${count} rows</title></g>`;
    })
    .join("");

  const svg = `${c.gridLines}${marks}${axisLines(t, plotW, plotH)}${c.yLabels}${c.xLabels}${c.axisTitleY}${c.axisTitleX}`;
  return {
    svg: wrap(spec, t, svg, "", null),
    table: {
      columns: ["Range", "Rows"],
      rows: bins.map((count, i) => [`${fmt(min + i * width, spec)} – ${fmt(min + (i + 1) * width, spec)}`, count]),
    },
  };
}

function barChart(spec, table, t) {
  let rows = sortRows(counts(table, spec.x, spec.maxCategories), spec.sort);
  let warning = null;
  if (rows.length > spec.maxCategories) {
    // Fold the tail rather than inventing more hues for it.
    const shown = rows.slice(0, spec.maxCategories - 1);
    const rest = rows.slice(spec.maxCategories - 1).reduce((a, r) => a + r.count, 0);
    warning = `${rows.length - shown.length} smaller categories folded into "Other".`;
    rows = [...shown, { label: "Other", count: rest }];
  }
  if (!rows.length) return empty(spec, t, "No categories to plot.");

  const plotW = 680 - PAD.left - PAD.right;
  const plotH = spec.height - PAD.top - PAD.bottom;
  const peak = Math.max(...rows.map((r) => r.count));
  const niceB = niceScaleBounds(0, peak, 4);
  const yTopB = spec.scaleY === "log" ? peak : niceB.hi;
  const yScale = makeScale(spec, spec.scaleY === "log" ? 1 : 0, yTopB, plotH);
  // Cap the band pitch as well as the bar thickness. Dividing the full width
  // by two categories gives 300px slots, which leaves a 24px bar stranded in
  // the middle of an empty band and reads as a broken chart.
  const slot = Math.min(plotW / rows.length, BAR_MAX * 2.6);
  const barW = Math.min(BAR_MAX, slot - SURFACE_GAP * 2);
  // Left-aligned: a centred short band leaves conspicuous dead space on both
  // sides and reads as a layout error rather than as air.
  const offset = 0;

  const yTicks = (spec.scaleY === "log" ? ticks(0, peak, 4) : niceTicks(0, niceB.hi, niceB.step)).map((v) => ({
    y: PAD.top + plotH - yScale(v),
    label: fmt(v, spec),
  }));
  const xTicks = rows.map((r, i) => ({
    x: PAD.left + offset + i * slot + slot / 2,
    label: r.label.length > 14 ? `${r.label.slice(0, 13)}…` : r.label,
    rotate: rows.length > 6,
  }));
  const c = chrome(spec, t, { xLabel: spec.xLabel ?? spec.x, yLabel: spec.yLabel ?? "Rows", yTicks, xTicks, plotW, plotH });

  const useCategorical = spec.palette === "categorical";
  const marks = rows
    .map((r, i) => {
      const h = yScale(r.count);
      const x = PAD.left + offset + i * slot + (slot - barW) / 2;
      const y = PAD.top + plotH - h;
      const fill = useCategorical ? seriesColor(i, spec.mode) : sequentialColor(r.count / peak, spec.mode);
      const label =
        spec.valueLabels && h > 14
          ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="11" fill="${
              t.text.secondary
            }">${fmt(r.count, spec)}</text>`
          : "";
      return `${roundedBar(x, y, barW, h, fill)}<title>${escapeAttr(r.label)}: ${r.count}</title></g>${label}`;
    })
    .join("");

  // Identity is never colour alone: with categorical hues, a legend is present.
  const legend =
    useCategorical && spec.legend !== "none"
      ? legendMarkup(rows.slice(0, 8).map((r, i) => ({ label: r.label, color: seriesColor(i, spec.mode) })), t)
      : "";

  const svg = `${c.gridLines}${marks}${axisLines(t, plotW, plotH)}${c.yLabels}${c.xLabels}${c.axisTitleY}${c.axisTitleX}`;
  return {
    svg: wrap(spec, t, svg, legend, warning),
    table: { columns: [spec.x, "Rows"], rows: rows.map((r) => [r.label, r.count]) },
    warning,
  };
}

function scatterChart(spec, table, t) {
  if (!spec.y) return empty(spec, t, "A scatter plot needs two numeric columns.");
  const data = pairs(table, spec.x, spec.y);
  if (data.length < 3) return empty(spec, t, "Not enough complete pairs to plot.");

  const xs = data.map((d) => d[0]);
  const ys = data.map((d) => d[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  if (xMin === xMax || yMin === yMax) return empty(spec, t, "One axis has no variation.");

  const plotW = 680 - PAD.left - PAD.right;
  const plotH = spec.height - PAD.top - PAD.bottom;
  const nx = niceScaleBounds(xMin, xMax, 5);
  const ny = niceScaleBounds(yMin, yMax, 5);
  const sx = linearScale(nx.lo, nx.hi, plotW);
  const sy = spec.scaleY === "log" ? makeScale(spec, yMin, yMax, plotH) : linearScale(ny.lo, ny.hi, plotH);

  // Scatter is an all-pairs form: any two groups can sit side by side, so the
  // series cap is three. Beyond that, fold rather than add hues.
  let groups = null;
  let warning = null;
  if (spec.colorBy) {
    const seen = new Map();
    for (const [, , row] of data) {
      const g = String(row[spec.colorBy] ?? "").trim() || "—";
      seen.set(g, (seen.get(g) || 0) + 1);
    }
    const ordered = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
    groups = ordered.slice(0, ALL_PAIRS_SERIES_CAP);
    if (ordered.length > ALL_PAIRS_SERIES_CAP) {
      warning = `${ordered.length - ALL_PAIRS_SERIES_CAP} smaller groups folded into "Other" — scatter caps at ${ALL_PAIRS_SERIES_CAP} colours for colourblind safety.`;
    }
  }

  const step = Math.max(1, Math.floor(data.length / 1500));
  const drawn = Math.ceil(data.length / step);
  // The 2px surface ring makes overlapping dots countable at low density; at
  // high density the rings merge and read as a striped smear, so past this
  // threshold the marks go smaller, thinner and more transparent instead.
  const dense = drawn > 150;
  const dotR = dense ? 3 : DOT_R;
  const ring = dense ? 0 : RING;
  const dotOpacity = dense ? 0.55 : 0.85;

  const dots = data
    .filter((_, i) => i % step === 0)
    .map(([x, y, row]) => {
      const cx = PAD.left + sx(x);
      const cy = PAD.top + plotH - sy(y);
      let color = seriesColor(0, spec.mode);
      let label = "";
      if (groups) {
        const g = String(row[spec.colorBy] ?? "").trim() || "—";
        const idx = groups.indexOf(g);
        color = idx === -1 ? t.text.muted : seriesColor(idx, spec.mode);
        label = `${spec.colorBy}: ${idx === -1 ? "Other" : g}\n`;
      }
      // 2px surface ring so overlapping dots stay countable.
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${dotR}" fill="${color}" stroke="${
        t.surface
      }" stroke-width="${ring}" opacity="${dotOpacity}"><title>${escapeAttr(label)}${spec.x}: ${fmt(x, spec)}\n${spec.y}: ${fmt(
        y,
        spec
      )}</title></circle>`;
    })
    .join("");

  const yTicks = (spec.scaleY === "log" ? ticks(yMin, yMax, 5) : niceTicks(ny.lo, ny.hi, ny.step)).map((v) => ({
    y: PAD.top + plotH - sy(v),
    label: fmt(v, spec),
  }));
  const xTicks = niceTicks(nx.lo, nx.hi, nx.step).map((v) => ({ x: PAD.left + sx(v), label: fmt(v, spec) }));
  const c = chrome(spec, t, { xLabel: spec.xLabel ?? spec.x, yLabel: spec.yLabel ?? spec.y, yTicks, xTicks, plotW, plotH });

  const legend =
    groups && spec.legend !== "none"
      ? legendMarkup(
          [
            ...groups.map((g, i) => ({ label: g, color: seriesColor(i, spec.mode) })),
            ...(warning ? [{ label: "Other", color: t.text.muted }] : []),
          ],
          t
        )
      : "";

  const svg = `${c.gridLines}${dots}${axisLines(t, plotW, plotH)}${c.yLabels}${c.xLabels}${c.axisTitleY}${c.axisTitleX}`;
  return {
    svg: wrap(spec, t, svg, legend, warning),
    table: {
      columns: [spec.x, spec.y],
      rows: data.slice(0, 200).map(([x, y]) => [fmt(x, spec), fmt(y, spec)]),
    },
    warning,
  };
}

function lineChart(spec, table, t) {
  if (!spec.y) return empty(spec, t, "A line chart needs a value column.");
  const data = pairs(table, spec.x, spec.y).sort((a, b) => a[0] - b[0]);
  if (data.length < 2) return empty(spec, t, "Not enough points to draw a line.");

  const xs = data.map((d) => d[0]);
  const ys = data.map((d) => d[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const plotW = 680 - PAD.left - PAD.right;
  const plotH = spec.height - PAD.top - PAD.bottom;
  const sx = linearScale(xMin, xMax, plotW);
  const sy = makeScale(spec, yMin, yMax, plotH);

  const d = data
    .map(([x, y], i) => `${i ? "L" : "M"}${(PAD.left + sx(x)).toFixed(1)} ${(PAD.top + plotH - sy(y)).toFixed(1)}`)
    .join(" ");

  const yTicks = ticks(yMin, yMax, 5).map((v) => ({ y: PAD.top + plotH - sy(v), label: fmt(v, spec) }));
  const xTicks = ticks(xMin, xMax, 5).map((v) => ({ x: PAD.left + sx(v), label: fmt(v, spec) }));
  const c = chrome(spec, t, { xLabel: spec.xLabel ?? spec.x, yLabel: spec.yLabel ?? spec.y, yTicks, xTicks, plotW, plotH });

  // 2px line, round joins; a single end marker rather than a dot on every point.
  const last = data[data.length - 1];
  const endDot = `<circle cx="${(PAD.left + sx(last[0])).toFixed(1)}" cy="${(PAD.top + plotH - sy(last[1])).toFixed(
    1
  )}" r="${DOT_R}" fill="${seriesColor(0, spec.mode)}" stroke="${t.surface}" stroke-width="${RING}"></circle>`;

  const svg = `${c.gridLines}<path d="${d}" fill="none" stroke="${seriesColor(
    0,
    spec.mode
  )}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>${endDot}${axisLines(
    t,
    plotW,
    plotH
  )}${c.yLabels}${c.xLabels}${c.axisTitleY}${c.axisTitleX}`;
  return {
    svg: wrap(spec, t, svg, "", null),
    table: { columns: [spec.x, spec.y], rows: data.slice(0, 200).map(([x, y]) => [fmt(x, spec), fmt(y, spec)]) },
  };
}

/**
 * Correlation heatmap on a diverging scale.
 *
 * Correlation is polarity data — it runs -1 to +1 through a meaningful zero — so
 * it gets two hues with a neutral gray middle, never a sequential ramp and never
 * a rainbow. Previously this was rendered as a table of bare numbers, which made
 * the reader do the comparison themselves.
 */
function heatmapChart(spec, table, t) {
  const names = spec.matrix?.names || [];
  const values = spec.matrix?.values || [];
  if (names.length < 2) return empty(spec, t, "Need at least two numeric columns to correlate.");

  const n = Math.min(names.length, 14);
  const shown = names.slice(0, n);
  const gridLeft = 150;
  const gridTop = PAD.top + 8;
  // Grow the cells to use the space. A fixed 34px cell left a three-column
  // matrix as a small square marooned in a wide canvas.
  const availableW = 680 - gridLeft - 30;
  const availableH = spec.height - gridTop - 96;
  const size = Math.max(18, Math.min(56, Math.floor(Math.min(availableW / n, availableH / n))));

  const cells = [];
  for (let r = 0; r < n; r += 1) {
    for (let cIdx = 0; cIdx < n; cIdx += 1) {
      const v = values[r]?.[cIdx];
      const x = gridLeft + cIdx * size;
      const y = gridTop + r * size;
      const fill = v === null || v === undefined ? t.grid : divergingColor(v, spec.mode);
      cells.push(
        `<rect x="${x}" y="${y}" width="${size - SURFACE_GAP}" height="${
          size - SURFACE_GAP
        }" fill="${fill}" stroke="${t.grid}" stroke-width="0.5" rx="2"><title>${escapeAttr(
          shown[r]
        )} vs ${escapeAttr(shown[cIdx])}: ${v === null || v === undefined ? "n/a" : v.toFixed(2)}</title></rect>`
      );
    }
  }

  const rowLabels = shown
    .map(
      (name, r) =>
        `<text x="${gridLeft - 8}" y="${gridTop + r * size + size / 2 + 4}" text-anchor="end" font-size="10" fill="${
          t.text.secondary
        }">${escapeText(name.length > 18 ? `${name.slice(0, 17)}…` : name)}</text>`
    )
    .join("");

  const colLabels = shown
    .map(
      (name, cIdx) =>
        `<text x="${gridLeft + cIdx * size + size / 2}" y="${gridTop + n * size + 14}" text-anchor="end" font-size="10" fill="${
          t.text.secondary
        }" transform="rotate(-45 ${gridLeft + cIdx * size + size / 2} ${gridTop + n * size + 14})">${escapeText(
          name.length > 18 ? `${name.slice(0, 17)}…` : name
        )}</text>`
    )
    .join("");

  // Diverging scales need their key: the midpoint must read as "nothing".
  const barW = 180;
  const barY = gridTop + n * size + 58;
  const stops = Array.from({ length: 21 }, (_, i) => {
    const v = -1 + (i / 20) * 2;
    return `<rect x="${gridLeft + (i / 21) * barW}" y="${barY}" width="${barW / 21 + 0.6}" height="10" fill="${divergingColor(
      v,
      spec.mode
    )}"></rect>`;
  }).join("");
  const key = `${stops}
<text x="${gridLeft}" y="${barY + 24}" font-size="10" fill="${t.text.muted}">−1</text>
<text x="${gridLeft + barW / 2}" y="${barY + 24}" text-anchor="middle" font-size="10" fill="${t.text.muted}">0</text>
<text x="${gridLeft + barW}" y="${barY + 24}" text-anchor="end" font-size="10" fill="${t.text.muted}">+1</text>`;

  const height = barY + 42; // fit the content rather than leaving dead space
  const svg = `${cells.join("")}${rowLabels}${colLabels}${key}`;
  return {
    svg: wrap({ ...spec, height }, t, svg, "", names.length > n ? `Showing the first ${n} of ${names.length} columns.` : null),
    table: {
      columns: ["", ...shown],
      rows: shown.map((name, r) => [name, ...shown.map((_, c) => (values[r]?.[c] ?? null))]),
    },
  };
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** Bar with a 4px rounded data-end, square at the baseline. */
function roundedBar(x, y, w, h, fill) {
  const r = Math.min(4, w / 2, h);
  const path =
    h <= r
      ? `M${x} ${y + h} h${w} v${-h} h${-w} Z`
      : `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
  return `<g><path d="${path}" fill="${fill}"></path>`;
}

function axisLines(t, plotW, plotH) {
  return `<line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${
    PAD.top + plotH
  }" stroke="${t.grid}" stroke-width="1"></line>`;
}

function empty(spec, t, message) {
  return {
    svg: `<figure class="viz viz--empty" data-chart-id="${spec.id}"><p>${escapeText(message)}</p></figure>`,
    table: { columns: [], rows: [] },
    warning: message,
  };
}

export function fmt(n, spec = {}) {
  if (!Number.isFinite(n)) return "—";
  if (spec.numberFormat === "integer") return Math.round(n).toLocaleString();
  if (spec.numberFormat === "1dp") return n.toFixed(1);
  if (spec.numberFormat === "percent") return `${(n * 100).toFixed(1)}%`;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (abs >= 10) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

function escapeText(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}
