// Chart rendering, on D3.
//
// Charts are described by a plain spec object. The spec is the single source of
// truth: the control panel edits it, this file draws it, and export.js turns the
// same object into manim. That is what keeps the exported code matching the
// picture on screen.
//
// Two halves, deliberately:
//
//   chartModel(spec, table)   pure. Scales, marks, legend, table view, warnings.
//                             No DOM, so it can be tested in node without jsdom.
//   renderChart(…, node)      thin. Hands the model to d3-selection and d3-axis.
//
// D3 supplies the scales, the tick rounding, the binning, the path building and
// the colour interpolation that this file used to reimplement by hand. The
// palette is *not* D3's — see palette.js, those hexes are validated against this
// site's surface for colour-vision deficiency, and d3-scale-chromatic's schemes
// are not.

import * as d3 from "../vendor/d3/d3.min.js";
import {
  theme,
  seriesColor,
  CATEGORICAL,
  SEQUENTIAL,
  DIVERGING,
  ALL_PAIRS_SERIES_CAP,
} from "./palette.js";

const W = 680; // viewBox width; CSS scales it to whatever the tile is
const PAD = { top: 18, right: 20, bottom: 58, left: 68 };
const BAR_MAX = 26; // never fill the slot; the leftover band is air
const MAX_PITCH = 68; // two categories must not sit marooned in 300px slots
const DOT_R = 4.5;
const RING = 2; // surface ring, so overlapping dots stay countable

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
    legend: spec.legend ?? "top", // top | none
    grid: spec.grid ?? "y", // none | y | both
    height: spec.height || 320,
    maxCategories: spec.maxCategories || 12,
    numberFormat: spec.numberFormat || "auto", // auto | integer | 1dp | percent
    matrix: spec.matrix || null, // heatmap payload, computed not generated
  };
}

const FORMATS = { integer: ",d", "1dp": ".1f", percent: ".1%", auto: "~s" };

/** d3.format, chosen by the spec. `~s` gives 1.5k / 2.3M without trailing zeros. */
export function formatter(spec) {
  const f = d3.format(FORMATS[spec.numberFormat] || FORMATS.auto);
  return (n) => (Number.isFinite(n) ? f(n) : "—");
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

const toNumber = (v) => Number.parseFloat(String(v).replace(/[\s,_]/g, ""));

function numbers(table, name) {
  return table.rows.map((r) => toNumber(r[name])).filter(Number.isFinite);
}

function pairs(table, xName, yName) {
  return table.rows
    .map((row) => [toNumber(row[xName]), toNumber(row[yName]), row])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

/** Category counts, most frequent first unless the spec says otherwise. */
function counts(table, name, sort) {
  const rows = d3
    .rollups(
      table.rows.filter((r) => String(r[name] ?? "").trim()),
      (v) => v.length,
      (r) => String(r[name]).trim()
    )
    .map(([label, count]) => ({ label, count }));

  if (sort === "value-desc") return d3.sort(rows, (a, b) => d3.descending(a.count, b.count));
  if (sort === "value-asc") return d3.sort(rows, (a, b) => d3.ascending(a.count, b.count));
  if (sort === "label") return d3.sort(rows, (a, b) => d3.ascending(a.label, b.label));
  return rows;
}

/**
 * A y scale that respects spec.scaleY.
 *
 * `.nice()` is the whole reason this file no longer carries a hand-rolled
 * 1/2/5 tick rounder: it snaps the domain outward to round numbers, so ticks
 * read 0, 5, 10, 15 rather than 0.00, 3.8, 7.5, 11.
 */
function valueScale(spec, max, plotH) {
  if (spec.scaleY === "log" && max > 0) {
    return d3.scaleLog().domain([1, Math.max(max, 10)]).range([plotH, 0]).nice();
  }
  return d3.scaleLinear().domain([0, max || 1]).range([plotH, 0]).nice();
}

// ---------------------------------------------------------------------------
// The model: pure, DOM-free, testable
// ---------------------------------------------------------------------------

/**
 * Turn a spec plus data into everything a renderer needs.
 *
 * @returns {{spec, plot, marks, xScale, yScale, xAxis, yAxis, legend, table,
 *            warning, empty}}
 */
export function chartModel(rawSpec, table) {
  const spec = normaliseSpec(rawSpec);
  // One chart failing must not take out the others. Without this a single bad
  // spec threw out of the render loop and silently dropped every chart after
  // it — the page looked like it had simply produced fewer results.
  try {
    switch (spec.type) {
      case "bar":
        return barModel(spec, table);
      case "scatter":
        return scatterModel(spec, table);
      case "line":
        return lineModel(spec, table);
      case "heatmap":
        return heatmapModel(spec, table);
      case "histogram":
      default:
        return histogramModel(spec, table);
    }
  } catch (error) {
    return empty(spec, `This chart could not be drawn: ${error.message}`);
  }
}

function frame(spec) {
  return {
    width: W,
    height: spec.height,
    plotW: W - PAD.left - PAD.right,
    plotH: spec.height - PAD.top - PAD.bottom,
    pad: PAD,
  };
}

function empty(spec, message) {
  return {
    spec,
    empty: true,
    warning: message,
    marks: [],
    table: { columns: [], rows: [] },
    plot: frame(spec),
  };
}

function histogramModel(spec, table) {
  const values = numbers(table, spec.x);
  if (values.length < 2) return empty(spec, "Not enough numeric values to plot.");

  const fmt = formatter(spec);
  const [min, max] = d3.extent(values);
  if (min === max) return empty(spec, `Every value of ${spec.x} is ${fmt(min)}.`);

  const plot = frame(spec);
  const bins = d3
    .bin()
    .domain([min, max])
    .thresholds(Math.max(3, Math.min(50, spec.bins)))(values);

  const peak = d3.max(bins, (b) => b.length) || 1;
  const xScale = d3.scaleLinear().domain([min, max]).range([0, plot.plotW]).nice();
  const yScale = valueScale(spec, peak, plot.plotH);
  const colour =
    spec.palette === "categorical"
      ? () => seriesColor(0, spec.mode)
      : d3.scaleQuantize().domain([0, peak]).range(SEQUENTIAL[spec.mode]);

  const marks = bins
    .map((b) => {
      const x0 = xScale(b.x0);
      const x1 = xScale(b.x1);
      const w = Math.min(BAR_MAX, Math.max(1, x1 - x0 - 2));
      const y = yScale(Math.max(b.length, spec.scaleY === "log" ? 1 : 0));
      return {
        kind: "rect",
        x: x0 + (x1 - x0 - w) / 2,
        y,
        width: w,
        height: Math.max(0, plot.plotH - y),
        fill: colour(b.length),
        title: `${fmt(b.x0)} to ${fmt(b.x1)}: ${b.length} rows`,
        value: b.length,
      };
    })
    .filter((m) => m.height > 0);

  return {
    spec,
    plot,
    marks,
    xScale,
    yScale,
    xAxis: { label: spec.xLabel ?? spec.x, format: fmt },
    yAxis: { label: spec.yLabel ?? "Rows", format: fmt },
    legend: [],
    table: {
      columns: ["Range", "Rows"],
      rows: bins.map((b) => [`${fmt(b.x0)} – ${fmt(b.x1)}`, b.length]),
    },
  };
}

function barModel(spec, table) {
  const fmt = formatter(spec);
  let rows = counts(table, spec.x, spec.sort);
  if (!rows.length) return empty(spec, "No categories to plot.");

  let warning = null;
  if (rows.length > spec.maxCategories) {
    // Fold the tail rather than inventing more hues for it.
    const shown = rows.slice(0, spec.maxCategories - 1);
    const rest = d3.sum(rows.slice(spec.maxCategories - 1), (r) => r.count);
    warning = `${rows.length - shown.length} smaller categories folded into "Other".`;
    rows = [...shown, { label: "Other", count: rest }];
  }

  const plot = frame(spec);
  const peak = d3.max(rows, (r) => r.count) || 1;
  // Cap the band pitch as well as the bar thickness. Dividing the full width by
  // two categories gives 300px slots, which leaves a 26px bar stranded in the
  // middle of an empty band and reads as a broken chart. Left-aligned, because
  // a centred short band leaves dead space on both sides and reads as a layout
  // error rather than as air.
  const bandW = Math.min(plot.plotW, rows.length * MAX_PITCH);
  const xScale = d3
    .scaleBand()
    .domain(rows.map((r) => r.label))
    .range([0, bandW])
    .padding(0.25);
  const yScale = valueScale(spec, peak, plot.plotH);

  const useCategorical = spec.palette === "categorical";
  const sequential = d3.scaleQuantize().domain([0, peak]).range(SEQUENTIAL[spec.mode]);
  const barW = Math.min(BAR_MAX, xScale.bandwidth());

  const marks = rows.map((r, i) => {
    const y = yScale(Math.max(r.count, spec.scaleY === "log" ? 1 : 0));
    return {
      kind: "rect",
      x: xScale(r.label) + (xScale.bandwidth() - barW) / 2,
      y,
      width: barW,
      height: Math.max(0, plot.plotH - y),
      fill: useCategorical ? seriesColor(i, spec.mode) : sequential(r.count),
      title: `${r.label}: ${r.count}`,
      label: spec.valueLabels ? fmt(r.count) : null,
      value: r.count,
    };
  });

  return {
    spec,
    plot,
    marks,
    xScale,
    yScale,
    xAxis: { label: spec.xLabel ?? spec.x, band: true, rotate: rows.length > 6 },
    yAxis: { label: spec.yLabel ?? "Rows", format: fmt },
    // Identity is never carried by colour alone, so categorical hues get a key.
    legend:
      useCategorical && spec.legend !== "none"
        ? rows.slice(0, 8).map((r, i) => ({ label: r.label, color: seriesColor(i, spec.mode) }))
        : [],
    table: { columns: [spec.x, "Rows"], rows: rows.map((r) => [r.label, r.count]) },
    warning,
  };
}

function scatterModel(spec, table) {
  if (!spec.y) return empty(spec, "A scatter plot needs two numeric columns.");
  const data = pairs(table, spec.x, spec.y);
  if (data.length < 3) return empty(spec, "Not enough complete pairs to plot.");

  const fmt = formatter(spec);
  const t = theme(spec.mode);
  const [xMin, xMax] = d3.extent(data, (d) => d[0]);
  const [yMin, yMax] = d3.extent(data, (d) => d[1]);
  if (xMin === xMax || yMin === yMax) return empty(spec, "One axis has no variation.");

  const plot = frame(spec);
  const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, plot.plotW]).nice();
  const yScale =
    spec.scaleY === "log" && yMin > 0
      ? d3.scaleLog().domain([yMin, yMax]).range([plot.plotH, 0]).nice()
      : d3.scaleLinear().domain([yMin, yMax]).range([plot.plotH, 0]).nice();

  // Scatter is an all-pairs form: any two groups can sit side by side, so the
  // series cap is three. Beyond that, fold rather than add hues.
  let groups = null;
  let warning = null;
  if (spec.colorBy) {
    const ordered = d3
      .rollups(data, (v) => v.length, ([, , row]) => String(row[spec.colorBy] ?? "").trim() || "—")
      .sort((a, b) => d3.descending(a[1], b[1]))
      .map(([g]) => g);
    groups = ordered.slice(0, ALL_PAIRS_SERIES_CAP);
    if (ordered.length > ALL_PAIRS_SERIES_CAP) {
      warning = `${ordered.length - ALL_PAIRS_SERIES_CAP} smaller groups folded into "Other". A scatter caps at ${ALL_PAIRS_SERIES_CAP} colours, because past that two of them stop being tellable apart under colourblind safety checks.`;
    }
  }
  const colour = groups
    ? d3.scaleOrdinal().domain(groups).range(CATEGORICAL[spec.mode]).unknown(t.text.muted)
    : () => seriesColor(0, spec.mode);

  const step = Math.max(1, Math.floor(data.length / 1500));
  const drawn = Math.ceil(data.length / step);
  // The surface ring makes overlapping dots countable at low density; at high
  // density the rings merge into a striped smear, so past this threshold the
  // marks go smaller, thinner and more transparent instead.
  const dense = drawn > 150;

  const marks = data
    .filter((_, i) => i % step === 0)
    .map(([x, y, row]) => {
      const g = groups ? String(row[spec.colorBy] ?? "").trim() || "—" : null;
      const inGroup = g !== null && groups.includes(g);
      return {
        kind: "circle",
        cx: xScale(x),
        cy: yScale(y),
        r: dense ? 3 : DOT_R,
        fill: groups ? (inGroup ? colour(g) : t.text.muted) : colour(),
        ring: dense ? 0 : RING,
        opacity: dense ? 0.55 : 0.85,
        title: `${g ? `${spec.colorBy}: ${inGroup ? g : "Other"}\n` : ""}${spec.x}: ${fmt(
          x
        )}\n${spec.y}: ${fmt(y)}`,
      };
    });

  return {
    spec,
    plot,
    marks,
    xScale,
    yScale,
    xAxis: { label: spec.xLabel ?? spec.x, format: fmt },
    yAxis: { label: spec.yLabel ?? spec.y, format: fmt },
    legend:
      groups && spec.legend !== "none"
        ? [
            ...groups.map((g) => ({ label: g, color: colour(g) })),
            ...(warning ? [{ label: "Other", color: t.text.muted }] : []),
          ]
        : [],
    table: {
      columns: [spec.x, spec.y],
      rows: data.slice(0, 200).map(([x, y]) => [fmt(x), fmt(y)]),
    },
    warning,
  };
}

function lineModel(spec, table) {
  if (!spec.y) return empty(spec, "A line chart needs a value column.");
  const data = d3.sort(pairs(table, spec.x, spec.y), (d) => d[0]);
  if (data.length < 2) return empty(spec, "Not enough points to draw a line.");

  const fmt = formatter(spec);
  const plot = frame(spec);
  const [xMin, xMax] = d3.extent(data, (d) => d[0]);
  const [yMin, yMax] = d3.extent(data, (d) => d[1]);

  const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, plot.plotW]).nice();
  const yScale =
    spec.scaleY === "log" && yMin > 0
      ? d3.scaleLog().domain([yMin, yMax]).range([plot.plotH, 0]).nice()
      : d3.scaleLinear().domain([yMin, yMax]).range([plot.plotH, 0]).nice();

  const stroke = seriesColor(0, spec.mode);
  const path = d3
    .line()
    .x((d) => xScale(d[0]))
    .y((d) => yScale(d[1]))(data);

  const last = data[data.length - 1];
  return {
    spec,
    plot,
    // 2px line, round joins; one end marker rather than a dot on every point.
    marks: [
      { kind: "path", d: path, stroke, width: 2 },
      { kind: "circle", cx: xScale(last[0]), cy: yScale(last[1]), r: DOT_R, fill: stroke, ring: RING, opacity: 1 },
    ],
    xScale,
    yScale,
    xAxis: { label: spec.xLabel ?? spec.x, format: fmt },
    yAxis: { label: spec.yLabel ?? spec.y, format: fmt },
    legend: [],
    table: {
      columns: [spec.x, spec.y],
      rows: data.slice(0, 200).map(([x, y]) => [fmt(x), fmt(y)]),
    },
  };
}

/**
 * Correlation heatmap on a diverging scale.
 *
 * Correlation is polarity data — it runs -1 to +1 through a meaningful zero — so
 * it gets two hues with a neutral middle, never a sequential ramp and never a
 * rainbow. The interpolator is built from palette.js's validated endpoints
 * rather than from d3-scale-chromatic.
 */
function heatmapModel(spec, table) {
  const names = spec.matrix?.names || [];
  const values = spec.matrix?.values || [];
  if (names.length < 2) return empty(spec, "Need at least two numeric columns to correlate.");

  const n = Math.min(names.length, 14);
  const shown = names.slice(0, n);
  const t = theme(spec.mode);
  const { low, mid, high } = DIVERGING[spec.mode];
  const colour = d3
    .scaleDiverging()
    .domain([-1, 0, 1])
    .interpolator(d3.interpolateRgbBasis([low, mid, high]));

  const gridLeft = 150;
  const gridTop = PAD.top + 8;
  // Grow the cells to use the space: a fixed cell size left a three-column
  // matrix as a small square marooned in a wide canvas.
  const size = Math.max(
    18,
    Math.min(56, Math.floor(Math.min((W - gridLeft - 30) / n, (spec.height - gridTop - 96) / n)))
  );

  const marks = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const v = values[r]?.[c];
      marks.push({
        kind: "rect",
        x: gridLeft + c * size,
        y: gridTop + r * size,
        width: size - 2,
        height: size - 2,
        fill: v === null || v === undefined ? t.grid : colour(v),
        title: `${shown[r]} vs ${shown[c]}: ${v === null || v === undefined ? "n/a" : v.toFixed(2)}`,
      });
    }
  }

  // Fit the canvas to the grid and its key rather than leaving dead space, or
  // clipping them when a wide matrix pushes past the requested height.
  const needed = gridTop + n * size + 58 + 42;

  return {
    spec,
    plot: { ...frame(spec), height: needed, gridLeft, gridTop, size, n },
    marks,
    heatmap: { names: shown, colour, size, gridLeft, gridTop },
    legend: [],
    table: {
      columns: ["", ...shown],
      rows: shown.map((name, r) => [name, ...shown.map((_, c) => values[r]?.[c] ?? null)]),
    },
    warning: names.length > n ? `Showing the first ${n} of ${names.length} columns.` : null,
  };
}

// ---------------------------------------------------------------------------
// The paint: d3-selection and d3-axis
// ---------------------------------------------------------------------------

/**
 * Draw a spec into a container element.
 *
 * @param {Element} node container; its contents are replaced
 * @returns {{table, warning}} the data table that accompanies the figure
 */
export function renderChart(rawSpec, table, node) {
  const model = chartModel(rawSpec, table);
  const { spec } = model;
  const t = theme(spec.mode);
  const root = d3.select(node);
  root.selectAll("*").remove();

  if (model.empty) {
    root
      .append("figure")
      .attr("class", "viz viz--empty")
      .attr("data-chart-id", spec.id)
      .append("p")
      .text(model.warning);
    return { table: model.table, warning: model.warning };
  }

  const figure = root
    .append("figure")
    .attr("class", "viz")
    .attr("data-chart-id", spec.id)
    .style("--viz-surface", t.surface)
    .style("--viz-text", t.text.primary);

  if (spec.title) figure.append("figcaption").attr("class", "viz__title").text(spec.title);

  if (model.legend.length) {
    const legend = figure.append("div").attr("class", "viz-legend");
    legend
      .selectAll("span.viz-legend__item")
      .data(model.legend)
      .join("span")
      .attr("class", "viz-legend__item")
      .each(function (d) {
        const item = d3.select(this);
        item.append("span").attr("class", "viz-legend__swatch").style("background", d.color);
        item.append("span").text(d.label);
      });
  }

  const svg = figure
    .append("svg")
    .attr("viewBox", `0 0 ${model.plot.width} ${model.plot.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", spec.title || spec.type);

  svg
    .append("rect")
    .attr("width", model.plot.width)
    .attr("height", model.plot.height)
    .attr("fill", t.surface);

  if (spec.type === "heatmap") paintHeatmap(svg, model, t);
  else paintPlot(svg, model, t);

  if (model.warning) figure.append("p").attr("class", "viz__warning").text(model.warning);
  if (spec.caption) figure.append("p").attr("class", "viz__caption").text(spec.caption);

  return { table: model.table, warning: model.warning };
}

function paintPlot(svg, model, t) {
  const { spec, plot, xScale, yScale } = model;
  const g = svg.append("g").attr("transform", `translate(${plot.pad.left},${plot.pad.top})`);

  // Gridlines: hairline, solid, recessive — never dashed.
  if (spec.grid !== "none") {
    g.append("g")
      .attr("class", "viz-grid")
      .selectAll("line")
      .data(yScale.ticks ? yScale.ticks(5) : [])
      .join("line")
      .attr("x1", 0)
      .attr("x2", plot.plotW)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", t.grid)
      .attr("stroke-width", 1);
  }

  for (const m of model.marks) {
    if (m.kind === "rect") {
      const rect = g
        .append("rect")
        .attr("x", m.x)
        .attr("y", m.y)
        .attr("width", m.width)
        .attr("height", m.height)
        .attr("rx", 3)
        .attr("fill", m.fill);
      rect.append("title").text(m.title);
      if (m.label && m.height > 14) {
        g.append("text")
          .attr("x", m.x + m.width / 2)
          .attr("y", m.y - 6)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("fill", t.text.secondary)
          .text(m.label);
      }
    } else if (m.kind === "circle") {
      const c = g
        .append("circle")
        .attr("cx", m.cx)
        .attr("cy", m.cy)
        .attr("r", m.r)
        .attr("fill", m.fill)
        .attr("stroke", t.surface)
        .attr("stroke-width", m.ring)
        .attr("opacity", m.opacity);
      if (m.title) c.append("title").text(m.title);
    } else if (m.kind === "path") {
      g.append("path")
        .attr("d", m.d)
        .attr("fill", "none")
        .attr("stroke", m.stroke)
        .attr("stroke-width", m.width)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");
    }
  }

  // Axes. d3.axisLeft/-Bottom own the ticks, so the 1/2/5 rounding this file
  // used to carry lives in scale.nice() instead.
  const xAxis = model.xAxis.band
    ? d3.axisBottom(xScale).tickFormat((d) => (d.length > 14 ? `${d.slice(0, 13)}…` : d))
    : d3.axisBottom(xScale).ticks(6).tickFormat(model.xAxis.format);

  const xg = g
    .append("g")
    .attr("transform", `translate(0,${plot.plotH})`)
    .call(xAxis)
    .attr("font-size", 11)
    .attr("color", t.text.secondary);

  if (model.xAxis.rotate) {
    xg.selectAll("text").attr("text-anchor", "end").attr("transform", "rotate(-35)").attr("dx", -6);
  }

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(model.yAxis.format))
    .attr("font-size", 11)
    .attr("color", t.text.secondary);

  if (model.xAxis.label) {
    g.append("text")
      .attr("x", plot.plotW / 2)
      .attr("y", plot.plotH + 46)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", t.text.muted)
      .text(model.xAxis.label);
  }
  if (model.yAxis.label) {
    g.append("text")
      .attr("transform", `rotate(-90)`)
      .attr("x", -plot.plotH / 2)
      .attr("y", -plot.pad.left + 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", t.text.muted)
      .text(model.yAxis.label);
  }
}

function paintHeatmap(svg, model, t) {
  const { names, colour, size, gridLeft, gridTop } = model.heatmap;
  const n = names.length;

  svg
    .selectAll("rect.viz-cell")
    .data(model.marks)
    .join("rect")
    .attr("class", "viz-cell")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("width", (d) => d.width)
    .attr("height", (d) => d.height)
    .attr("rx", 2)
    .attr("fill", (d) => d.fill)
    .attr("stroke", t.grid)
    .attr("stroke-width", 0.5)
    .append("title")
    .text((d) => d.title);

  const short = (name) => (name.length > 18 ? `${name.slice(0, 17)}…` : name);

  svg
    .selectAll("text.viz-row")
    .data(names)
    .join("text")
    .attr("class", "viz-row")
    .attr("x", gridLeft - 8)
    .attr("y", (_, i) => gridTop + i * size + size / 2 + 4)
    .attr("text-anchor", "end")
    .attr("font-size", 10)
    .attr("fill", t.text.secondary)
    .text(short);

  svg
    .selectAll("text.viz-col")
    .data(names)
    .join("text")
    .attr("class", "viz-col")
    .attr("transform", (_, i) => {
      const x = gridLeft + i * size + size / 2;
      const y = gridTop + n * size + 14;
      return `rotate(-45 ${x} ${y})`;
    })
    .attr("x", (_, i) => gridLeft + i * size + size / 2)
    .attr("y", gridTop + n * size + 14)
    .attr("text-anchor", "end")
    .attr("font-size", 10)
    .attr("fill", t.text.secondary)
    .text(short);

  // Diverging scales need their key: the midpoint must read as "nothing".
  const barW = 180;
  const barY = gridTop + n * size + 58;
  const stops = d3.range(0, 21).map((i) => -1 + (i / 20) * 2);
  svg
    .selectAll("rect.viz-key")
    .data(stops)
    .join("rect")
    .attr("class", "viz-key")
    .attr("x", (_, i) => gridLeft + (i / 21) * barW)
    .attr("y", barY)
    .attr("width", barW / 21 + 0.6)
    .attr("height", 10)
    .attr("fill", (d) => colour(d));

  for (const [x, anchor, label] of [
    [gridLeft, "start", "−1"],
    [gridLeft + barW / 2, "middle", "0"],
    [gridLeft + barW, "end", "+1"],
  ]) {
    svg
      .append("text")
      .attr("x", x)
      .attr("y", barY + 24)
      .attr("text-anchor", anchor)
      .attr("font-size", 10)
      .attr("fill", t.text.muted)
      .text(label);
  }
}
