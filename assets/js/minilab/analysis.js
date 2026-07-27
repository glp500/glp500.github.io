// Analysis planning and execution.
//
// Division of responsibility, which is what makes the report trustworthy:
//
//   the model  — chooses WHICH analysis suits the data, and writes the prose
//   this file  — computes every number, from vetted templates only
//
// The model never emits Python that gets executed, and never supplies a
// figure that reaches the report.

import { runGuarded } from "./harness.js";
import { record } from "./diagnostics.js";

export const TASKS = {
  summary: "Describe the shape of the data and the distribution of its columns.",
  correlation: "Measure how numeric columns move together.",
  classification: "Predict a categorical target from the other columns.",
  regression: "Predict a numeric target from the other columns.",
};

const PLAN_SYSTEM = `You choose an analysis for a tabular dataset.
You are given only the schema and summary statistics, never the rows.
Reply with a single JSON object and nothing else:

{"task":"summary|correlation|classification|regression",
 "target":"<column name or null>",
 "features":["<column name>", ...],
 "charts":[{"kind":"histogram|bar|scatter","x":"<column>","y":"<column or null>"}],
 "rationale":"<one sentence>"}

Rules:
- "target" must be null for summary and correlation.
- classification needs a categorical or binary target; regression needs a numeric target.
- Only use column names exactly as given.
- Choose at most three charts.`;

/** JSON schema for the structural gate. Also sent as a decode constraint. */
export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    task: { type: "string", enum: ["summary", "correlation", "classification", "regression"] },
    target: { type: ["string", "null"] },
    features: { type: "array", items: { type: "string" } },
    charts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["histogram", "bar", "scatter"] },
          x: { type: "string" },
          y: { type: ["string", "null"] },
        },
        required: ["kind", "x"],
      },
    },
    rationale: { type: "string" },
  },
  required: ["task"],
};

/**
 * Ask the model for a plan under the harness, then repair anything it got
 * wrong. Always returns a runnable plan: if the model is slow, cancelled, or
 * wrong twice over, the deterministic fallback takes its place.
 *
 * @returns {{plan: object, source: "model"|"fallback", reason: string}}
 */
export async function planAnalysis(schema, { signal, onProgress } = {}) {
  const columnNames = new Set(schema.columns.map((c) => c.name));

  const result = await runGuarded({
    messages: [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: JSON.stringify(schema) },
    ],
    schema: PLAN_SCHEMA,
    signal,
    onProgress,
    // Semantic gate: schema-valid JSON can still name a column that is not
    // there. Reject with the specific reason so the repair turn is useful.
    validate: (parsed) => {
      if (!parsed || typeof parsed !== "object") {
        return { ok: false, error: "The reply was not an object." };
      }
      if (!(parsed.task in TASKS)) {
        return {
          ok: false,
          error: `"${parsed.task}" is not one of: ${Object.keys(TASKS).join(", ")}.`,
        };
      }
      if (parsed.target && !columnNames.has(parsed.target)) {
        return { ok: false, error: `Column "${parsed.target}" does not exist in this file.` };
      }
      const badChart = (parsed.charts || []).find((c) => c?.x && !columnNames.has(c.x));
      if (badChart) {
        return { ok: false, error: `Chart column "${badChart.x}" does not exist in this file.` };
      }
      return { ok: true, value: parsed };
    },
  });

  record("plan.result", { ok: result.ok, reason: result.reason, attempts: result.attempts.length });

  // validatePlan runs either way — it is the guarantee, not a formality.
  const plan = validatePlan(result.ok ? result.value : null, schema);
  return {
    plan,
    source: result.ok ? "model" : "fallback",
    reason: result.reason,
  };
}

/**
 * Force a plan to be runnable. A small model will hallucinate column names and
 * pick impossible targets, so every field is checked against the real schema
 * and silently corrected rather than trusted.
 */
export function validatePlan(plan, schema) {
  const byName = new Map(schema.columns.map((c) => [c.name, c]));
  const numeric = schema.columns.filter((c) => c.type === "number" || c.type === "integer");
  const categorical = schema.columns.filter((c) => c.type === "categorical" || c.type === "binary");

  const corrections = [];
  const safe = {
    task: "summary",
    target: null,
    features: [],
    charts: [],
    rationale: "",
    corrections,
  };

  if (!plan || typeof plan !== "object") {
    safe.rationale = "The model did not return a usable plan, so the data is summarised instead.";
    corrections.push("Fell back to a summary because the model returned no valid plan.");
    safe.charts = defaultCharts(numeric, categorical);
    return safe;
  }

  safe.rationale = typeof plan.rationale === "string" ? plan.rationale.slice(0, 300) : "";

  let task = String(plan.task || "summary").toLowerCase();
  if (!(task in TASKS)) {
    corrections.push(`"${plan.task}" is not a supported task; used a summary instead.`);
    task = "summary";
  }

  let target = typeof plan.target === "string" && byName.has(plan.target) ? plan.target : null;
  if (plan.target && !target) {
    corrections.push(`Target "${plan.target}" is not a column in this file.`);
  }

  if (task === "classification") {
    if (!target || !["categorical", "binary", "text"].includes(byName.get(target).type)) {
      const replacement = categorical[0]?.name || null;
      if (replacement) {
        corrections.push(
          `Classification needs a categorical target; used "${replacement}".`
        );
        target = replacement;
      } else {
        corrections.push("No categorical column to classify, so the data is summarised instead.");
        task = "summary";
        target = null;
      }
    }
  } else if (task === "regression") {
    if (!target || !["number", "integer"].includes(byName.get(target).type)) {
      const replacement = numeric[0]?.name || null;
      if (replacement) {
        corrections.push(`Regression needs a numeric target; used "${replacement}".`);
        target = replacement;
      } else {
        corrections.push("No numeric column to predict, so the data is summarised instead.");
        task = "summary";
        target = null;
      }
    }
  } else {
    target = null;
  }

  if (task === "correlation" && numeric.length < 2) {
    corrections.push("Correlation needs at least two numeric columns; summarised instead.");
    task = "summary";
  }

  const features = Array.isArray(plan.features)
    ? plan.features.filter((f) => byName.has(f) && f !== target)
    : [];
  safe.features = features.length
    ? features
    : schema.columns.filter((c) => c.name !== target && c.type !== "identifier").map((c) => c.name);

  const charts = Array.isArray(plan.charts) ? plan.charts : [];
  safe.charts = charts
    .filter((c) => c && byName.has(c.x))
    .filter((c) => !c.y || byName.has(c.y))
    .slice(0, 3)
    .map((c) => ({ kind: ["histogram", "bar", "scatter"].includes(c.kind) ? c.kind : "histogram", x: c.x, y: c.y || null }));

  if (!safe.charts.length) safe.charts = defaultCharts(numeric, categorical);

  safe.task = task;
  safe.target = target;
  return safe;
}

function defaultCharts(numeric, categorical) {
  const charts = [];
  if (numeric[0]) charts.push({ kind: "histogram", x: numeric[0].name, y: null });
  if (categorical[0]) charts.push({ kind: "bar", x: categorical[0].name, y: null });
  if (numeric.length >= 2) {
    charts.push({ kind: "scatter", x: numeric[0].name, y: numeric[1].name });
  }
  return charts.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Computation — every number in the report originates here.
// ---------------------------------------------------------------------------

export function runAnalysis(table, profile, plan) {
  const results = { task: plan.task, target: plan.target, metrics: {}, tables: [] };

  if (plan.task === "correlation" || plan.task === "summary") {
    const numeric = profile.columns.filter((c) => c.type === "number" || c.type === "integer");
    if (numeric.length >= 2) {
      results.tables.push({
        title: "Pearson correlation",
        matrix: correlationMatrix(table, numeric.map((c) => c.name)),
      });
    }
  }

  if (plan.task === "classification") {
    results.metrics = classSummary(table, plan.target);
  }

  if (plan.task === "regression") {
    results.metrics = regressionSummary(table, plan.target, plan.features, profile);
  }

  return results;
}

function columnValues(table, name) {
  return table.rows.map((r) => Number.parseFloat(String(r[name]).replace(/[\s,_]/g, "")));
}

function correlationMatrix(table, names) {
  const series = names.map((n) => columnValues(table, n));
  return {
    names,
    values: series.map((a) => series.map((b) => round(pearson(a, b)))),
  };
}

function pearson(a, b) {
  const pairs = [];
  for (let i = 0; i < a.length; i += 1) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) pairs.push([a[i], b[i]]);
  }
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  pairs.forEach(([x, y]) => {
    num += (x - ma) * (y - mb);
    da += (x - ma) ** 2;
    db += (y - mb) ** 2;
  });
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

function classSummary(table, target) {
  const counts = new Map();
  table.rows.forEach((r) => {
    const v = String(r[target] ?? "").trim();
    if (v) counts.set(v, (counts.get(v) || 0) + 1);
  });
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    classes: sorted.length,
    total,
    majorityClass: sorted[0]?.[0] ?? null,
    // The score any model must beat to be worth anything.
    majorityBaseline: total ? round(sorted[0][1] / total) : null,
    distribution: sorted.slice(0, 8).map(([value, count]) => ({ value, count })),
  };
}

function regressionSummary(table, target, features, profile) {
  const y = columnValues(table, target);
  const numericFeatures = features.filter((f) => {
    const col = profile.columns.find((c) => c.name === f);
    return col && (col.type === "number" || col.type === "integer");
  });
  const correlations = numericFeatures
    .map((f) => ({ feature: f, r: round(pearson(columnValues(table, f), y)) }))
    .filter((c) => c.r !== null)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  const finite = y.filter(Number.isFinite);
  const mean = finite.reduce((a, b) => a + b, 0) / (finite.length || 1);
  return {
    n: finite.length,
    targetMean: round(mean),
    targetStd: round(Math.sqrt(finite.reduce((a, b) => a + (b - mean) ** 2, 0) / (finite.length || 1))),
    strongestPredictors: correlations.slice(0, 5),
  };
}

function round(n) {
  if (n === null || !Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}
