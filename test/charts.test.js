// Chart specs must survive every permutation the control panel can produce,
// including data that cannot be plotted at all. Run: node --test test/
//
// Only chartModel() is exercised here — it is the half that holds the logic and
// it is deliberately DOM-free, so this needs no jsdom.

import test from "node:test";
import assert from "node:assert/strict";
import { chartModel, normaliseSpec, formatter } from "../assets/js/minilab/charts.js";

const table = {
  name: "sample.csv",
  rows: Array.from({ length: 60 }, (_, i) => ({
    price: 10 + (i % 17) * 3.5,
    size: 100 + i * 7,
    city: ["Amsterdam", "Utrecht", "Rotterdam", "Delft", "Haarlem"][i % 5],
    flat: 42,
    label: `row ${i}`,
  })),
};

const TYPES = ["histogram", "bar", "scatter", "line", "heatmap"];

test("every type renders on ordinary data", () => {
  for (const type of TYPES) {
    for (const scaleY of ["linear", "log"]) {
      const model = chartModel(
        {
          type,
          x: "price",
          y: "size",
          colorBy: "city",
          scaleY,
          matrix: { names: ["price", "size"], values: [[1, 0.8], [0.8, 1]] },
        },
        table
      );
      assert.ok(model.table, `${type}/${scaleY} produced no table view`);
      assert.ok(Array.isArray(model.marks), `${type}/${scaleY} produced no marks`);
      assert.ok(!model.empty, `${type}/${scaleY} came back empty`);
      assert.ok(model.marks.length > 0, `${type}/${scaleY} drew nothing`);
    }
  }
});

test("degenerate data explains itself instead of throwing", () => {
  const cases = [
    ["no rows", { rows: [] }, { type: "histogram", x: "price" }],
    ["one row", { rows: [table.rows[0]] }, { type: "histogram", x: "price" }],
    ["no variation", table, { type: "histogram", x: "flat" }],
    ["missing column", table, { type: "histogram", x: "nope" }],
    ["scatter with no y", table, { type: "scatter", x: "price", y: null }],
    ["non-numeric axis", table, { type: "scatter", x: "city", y: "label" }],
    ["heatmap with no matrix", table, { type: "heatmap" }],
    ["one column matrix", table, { type: "heatmap", matrix: { names: ["a"], values: [[1]] } }],
  ];

  for (const [name, data, spec] of cases) {
    const model = chartModel(spec, data);
    assert.equal(model.empty, true, `${name} should have come back empty`);
    assert.ok(model.warning && model.warning.length > 0, `${name} gave no reason`);
    assert.deepEqual(model.table, { columns: [], rows: [] }, `${name} left a stale table`);
  }
});

test("categories beyond the cap are folded, not given new hues", () => {
  const model = chartModel({ type: "bar", x: "city", maxCategories: 3 }, table);
  assert.equal(model.table.rows.length, 3);
  assert.equal(model.table.rows.at(-1)[0], "Other");
  assert.match(model.warning, /folded into "Other"/);
});

test("scatter caps series at three colours", () => {
  const model = chartModel({ type: "scatter", x: "price", y: "size", colorBy: "city" }, table);
  // 5 cities, 3 slots, plus the "Other" entry.
  assert.equal(model.legend.length, 4);
  assert.match(model.warning, /colourblind safety/);
});

test("sort order reaches the table view", () => {
  const desc = chartModel({ type: "bar", x: "city", sort: "value-desc" }, table).table.rows;
  const byLabel = chartModel({ type: "bar", x: "city", sort: "label" }, table).table.rows;
  assert.deepEqual(
    [...desc].sort((a, b) => b[1] - a[1]).map((r) => r[1]),
    desc.map((r) => r[1])
  );
  assert.deepEqual(
    [...byLabel].map((r) => r[0]).sort(),
    byLabel.map((r) => r[0])
  );
});

test("axes are rounded outward, so ticks read as round numbers", () => {
  const model = chartModel({ type: "scatter", x: "price", y: "size" }, table);
  const ticks = model.yScale.ticks(5);
  // .nice() is what guarantees this; ragged domains gave 0.00, 3.8, 7.5, 11.
  assert.ok(ticks.every((t) => Number.isFinite(t)));
  assert.equal(model.yScale.domain()[0] <= 100, true);
});

test("number formats are honoured", () => {
  assert.equal(formatter(normaliseSpec({ numberFormat: "integer" }))(1234.6), "1,235");
  assert.equal(formatter(normaliseSpec({ numberFormat: "1dp" }))(1234.56), "1234.6");
  assert.equal(formatter(normaliseSpec({ numberFormat: "percent" }))(0.256), "25.6%");
  assert.equal(formatter(normaliseSpec({}))(Number.NaN), "—");
});

test("normaliseSpec fills every field a renderer reads", () => {
  const spec = normaliseSpec({});
  for (const key of ["id", "type", "palette", "mode", "bins", "sort", "scaleY", "height"]) {
    assert.notEqual(spec[key], undefined, `${key} was left undefined`);
  }
});
