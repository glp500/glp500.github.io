// The generated Python has to be Python. Nothing here renders a video — that
// needs manim, ffmpeg, cairo and LaTeX installed — but a syntax error in the
// codegen is the failure that actually happens, and py_compile catches it
// without any of that. Run: node --test "test/*.test.js"

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPython, buildRequirements } from "../assets/js/minilab/export.js";
import { normaliseSpec } from "../assets/js/minilab/charts.js";

const profile = {
  columnCount: 4,
  columns: [
    { name: "price", type: "number" },
    { name: "size", type: "integer" },
    { name: "city", type: "categorical" },
    { name: "sold", type: "binary" },
  ],
};

const dir = mkdtempSync(join(tmpdir(), "minilab-export-"));

function compiles(source, label) {
  const file = join(dir, `${label.replace(/\W+/g, "_")}.py`);
  writeFileSync(file, source);
  try {
    execFileSync("python3", ["-m", "py_compile", file], { stdio: "pipe" });
    return null;
  } catch (error) {
    return String(error.stderr || error.message);
  }
}

const TASKS = ["summary", "correlation", "classification", "regression"];
const TYPES = ["histogram", "bar", "scatter", "line", "heatmap"];

test("every task × chart-type combination generates valid Python", () => {
  for (const task of TASKS) {
    for (const type of TYPES) {
      const plan = {
        task,
        target: task === "classification" ? "city" : task === "regression" ? "price" : null,
        features: ["price", "size", "city"],
        charts: [normaliseSpec({ type, x: "price", y: "size", colorBy: "city" })],
      };
      const label = `${task}_${type}`;
      const error = compiles(buildPython(plan, profile, "sample.csv"), label);
      assert.equal(error, null, `${label} did not compile:\n${error}`);
    }
  }
});

test("control-panel permutations survive codegen", () => {
  const permutations = [
    { type: "bar", sort: "value-asc", valueLabels: true, palette: "categorical" },
    { type: "bar", sort: "label", maxCategories: 3 },
    { type: "scatter", scaleY: "log", colorBy: null },
    { type: "line", scaleY: "log" },
    { type: "histogram", bins: 7, numberFormat: "percent" },
    { type: "heatmap", mode: "dark" },
    { type: "scatter", title: 'A title with "quotes"', caption: "A caption" },
  ];

  for (const [i, extra] of permutations.entries()) {
    const plan = {
      task: "summary",
      target: null,
      features: [],
      charts: [normaliseSpec({ x: "price", y: "size", ...extra })],
    };
    const error = compiles(buildPython(plan, profile, "sample.csv"), `perm_${i}`);
    assert.equal(error, null, `permutation ${i} (${extra.type}) did not compile:\n${error}`);
  }
});

test("spec fields reach the generated scene", () => {
  const plan = {
    task: "summary",
    target: null,
    features: [],
    charts: [
      normaliseSpec({
        type: "bar",
        x: "city",
        title: "Sales by city",
        scaleY: "log",
        valueLabels: true,
        maxCategories: 5,
        mode: "dark",
      }),
    ],
  };
  const code = buildPython(plan, profile, "sample.csv");

  assert.match(code, /class Chart1\(Scene\)/);
  assert.match(code, /Sales by city/);
  assert.match(code, /get_bar_labels/, "value labels did not reach the scene");
  assert.match(code, /category_counts\(df\["city"\], 5/, "maxCategories did not reach the scene");
  assert.match(code, /SURFACE = "#1a1a19"/, "dark mode did not reach the palette");
  assert.match(code, /manim -pql analysis\.py Chart1/, "no render command in the docstring");
});

test("log scale reaches an Axes-based scene", () => {
  const plan = {
    task: "summary",
    target: null,
    features: [],
    charts: [normaliseSpec({ type: "scatter", x: "price", y: "size", scaleY: "log" })],
  };
  assert.match(buildPython(plan, profile, "sample.csv"), /LogBase\(10\)/);
});

test("the model block is not run on import", () => {
  const plan = {
    task: "regression",
    target: "price",
    features: ["size", "city"],
    charts: [normaliseSpec({ type: "histogram", x: "price" })],
  };
  const code = buildPython(plan, profile, "sample.csv");
  // manim imports this file to find the Scene. Training at module level would
  // retrain a random forest on every render.
  assert.match(code, /def model_report\(\):/);
  assert.match(code, /if __name__ == "__main__":/);
  // The import may sit at module level; the training must not.
  assert.ok(
    code.indexOf("def model_report():") < code.indexOf("model.fit("),
    "the forest is trained outside the function"
  );
});

test("requirements name the system dependencies manim needs", () => {
  const reqs = buildRequirements({ task: "regression", fileName: "sample.xlsx" });
  assert.match(reqs, /manim>=/);
  assert.match(reqs, /ffmpeg/);
  assert.match(reqs, /scikit-learn/);
  assert.match(reqs, /openpyxl/);
  assert.doesNotMatch(reqs, /matplotlib/);
});
