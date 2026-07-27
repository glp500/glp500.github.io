// The chart control panel.
//
// Every control edits one field of a chart spec. The spec is the single source
// of truth — the SVG renderer draws from it and export.js generates matplotlib
// from it — which is what makes "take the code" reproduce what is on screen
// rather than approximate it.
//
// The palette control deliberately offers only validated sets. A colour picker
// here would let the panel produce a chart that fails the colourblind gates,
// so the choice is between checked options, not arbitrary hex.

import { PALETTES } from "./palette.js";

const TYPES = [
  { id: "histogram", label: "Histogram", needs: ["x"] },
  { id: "bar", label: "Bar", needs: ["x"] },
  { id: "scatter", label: "Scatter", needs: ["x", "y"] },
  { id: "line", label: "Line", needs: ["x", "y"] },
];

/**
 * @param {object} spec       normalised chart spec
 * @param {object} profile    column profile, for the column pickers
 * @param {Function} onChange (patch) => void
 */
export function renderControls(spec, profile, index) {
  const numeric = profile.columns.filter((c) => c.type === "number" || c.type === "integer");
  const categorical = profile.columns.filter((c) => c.type === "categorical" || c.type === "binary");
  const all = profile.columns;

  const id = (name) => `viz-${index}-${name}`;

  return `
<details class="viz-controls" data-controls-for="${spec.id}">
  <summary>Adjust this chart</summary>
  <div class="viz-controls__grid">

    <fieldset>
      <legend>Type &amp; encoding</legend>
      ${select(id("type"), "Chart", "type", TYPES.map((t) => [t.id, t.label]), spec.type)}
      ${select(id("x"), "X axis", "x", all.map((c) => [c.name, c.name]), spec.x)}
      ${select(id("y"), "Y axis", "y", [["", "—"], ...numeric.map((c) => [c.name, c.name])], spec.y || "")}
      ${select(id("colorBy"), "Colour by", "colorBy", [["", "—"], ...categorical.map((c) => [c.name, c.name])], spec.colorBy || "")}
      ${select(id("sort"), "Sort", "sort", [["value-desc", "Largest first"], ["value-asc", "Smallest first"], ["label", "By label"], ["none", "File order"]], spec.sort)}
      ${number(id("bins"), "Bins", "bins", spec.bins, 3, 50)}
    </fieldset>

    <fieldset>
      <legend>Colour &amp; theme</legend>
      ${select(id("palette"), "Palette", "palette", PALETTES.map((p) => [p.id, p.label]), spec.palette)}
      ${select(id("mode"), "Surface", "mode", [["light", "Light"], ["dark", "Dark"]], spec.mode)}
      <p class="viz-controls__note">Only palettes that pass the colourblind and contrast checks are offered.</p>
    </fieldset>

    <fieldset>
      <legend>Labels</legend>
      ${text(id("title"), "Title", "title", spec.title)}
      ${text(id("xLabel"), "X label", "xLabel", spec.xLabel ?? "")}
      ${text(id("yLabel"), "Y label", "yLabel", spec.yLabel ?? "")}
      ${text(id("caption"), "Caption", "caption", spec.caption)}
      ${select(id("numberFormat"), "Numbers", "numberFormat", [["auto", "Automatic"], ["integer", "Whole"], ["1dp", "1 decimal"], ["percent", "Percent"]], spec.numberFormat)}
      ${checkbox(id("valueLabels"), "Value labels", "valueLabels", spec.valueLabels)}
      ${select(id("legend"), "Legend", "legend", [["top", "Top"], ["none", "Hidden"]], spec.legend)}
    </fieldset>

    <fieldset>
      <legend>Scale &amp; layout</legend>
      ${select(id("scaleY"), "Y scale", "scaleY", [["linear", "Linear"], ["log", "Logarithmic"]], spec.scaleY)}
      ${select(id("grid"), "Gridlines", "grid", [["y", "Horizontal"], ["both", "Both"], ["none", "None"]], spec.grid)}
      ${number(id("height"), "Height", "height", spec.height, 220, 640, 20)}
      ${number(id("maxCategories"), "Max categories", "maxCategories", spec.maxCategories, 3, 30)}
    </fieldset>

  </div>
</details>`;
}

/** Read a control's value back with the right type. */
export function readControl(input) {
  const field = input.dataset.field;
  if (!field) return null;
  let value;
  if (input.type === "checkbox") value = input.checked;
  else if (input.type === "number") value = Number(input.value);
  else value = input.value;
  if (value === "" && ["y", "colorBy"].includes(field)) value = null;
  return { field, value };
}

/**
 * Some combinations cannot be drawn — a scatter with no Y, a histogram of a
 * text column. Repair the spec rather than rendering an error.
 */
export function reconcileSpec(spec, profile) {
  const byName = new Map(profile.columns.map((c) => [c.name, c]));
  const numeric = profile.columns.filter((c) => c.type === "number" || c.type === "integer");
  const next = { ...spec };
  const notes = [];

  const xCol = byName.get(next.x);

  if (next.type === "histogram" && xCol && !["number", "integer"].includes(xCol.type)) {
    notes.push(`${next.x} is not numeric, so this is shown as a bar chart.`);
    next.type = "bar";
  }

  if ((next.type === "scatter" || next.type === "line") && !next.y) {
    next.y = numeric.find((c) => c.name !== next.x)?.name || null;
    if (next.y) notes.push(`Y axis set to ${next.y}.`);
    else {
      notes.push("Not enough numeric columns for that chart; showing a bar chart.");
      next.type = "bar";
    }
  }

  if ((next.type === "scatter" || next.type === "line") && xCol && !["number", "integer"].includes(xCol.type)) {
    const replacement = numeric.find((c) => c.name !== next.y)?.name;
    if (replacement) {
      notes.push(`X axis needs a number, so it is set to ${replacement}.`);
      next.x = replacement;
    } else {
      next.type = "bar";
    }
  }

  return { spec: next, notes };
}

// --- small form helpers ----------------------------------------------------

function select(id, label, field, options, value) {
  return `<label class="viz-control" for="${id}"><span>${label}</span>
    <select id="${id}" data-field="${field}">
      ${options
        .map(([v, l]) => `<option value="${escapeAttr(v)}"${String(v) === String(value ?? "") ? " selected" : ""}>${escapeText(l)}</option>`)
        .join("")}
    </select></label>`;
}

function text(id, label, field, value) {
  return `<label class="viz-control" for="${id}"><span>${label}</span>
    <input id="${id}" type="text" data-field="${field}" value="${escapeAttr(value ?? "")}"></label>`;
}

function number(id, label, field, value, min, max, step = 1) {
  return `<label class="viz-control" for="${id}"><span>${label}</span>
    <input id="${id}" type="number" data-field="${field}" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
}

function checkbox(id, label, field, checked) {
  return `<label class="viz-control viz-control--check" for="${id}">
    <input id="${id}" type="checkbox" data-field="${field}"${checked ? " checked" : ""}><span>${label}</span></label>`;
}

function escapeText(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}
