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
import { buildPlanContext } from "./context.js";

export const TASKS = {
  summary: "Describe the shape of the data and the distribution of its columns.",
  correlation: "Measure how numeric columns move together.",
  classification: "Predict a categorical target from the other columns.",
  regression: "Predict a numeric target from the other columns.",
};

const PLAN_SYSTEM = `Pick one analysis for this table. Reply with only JSON:
{"task":"summary|correlation|classification|regression","target":"<column or null>","rationale":"<12 words>"}
target is null for summary and correlation, categorical for classification, numeric for regression.`;

/**
 * Schema for the structural gate, also sent as a decode constraint.
 *
 * Deliberately tiny. On a CPU-only machine the model runs at a few tokens per
 * second, so every field it must emit costs real seconds. The genuinely
 * model-shaped decision is *which analysis* and *on which column*; feature
 * lists and chart choices are derived far more reliably from the column types
 * we already computed. Asking for less is what makes this finish.
 */
export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    task: { type: "string", enum: ["summary", "correlation", "classification", "regression"] },
    target: { type: ["string", "null"] },
    rationale: { type: "string", maxLength: 140 },
  },
  required: ["task"],
  additionalProperties: false,
};

/**
 * Ask the model for a plan under the harness, then repair anything it got
 * wrong. Always returns a runnable plan: if the model is slow, cancelled, or
 * wrong twice over, the deterministic fallback takes its place.
 *
 * @returns {{plan: object, source: "model"|"fallback", reason: string}}
 */
export async function planAnalysis(schema, { signal, onProgress, profile, nCtx = 4096, limits = {}, constraints = null } = {}) {
  const columnNames = new Set(schema.columns.map((c) => c.name));

  // Select rather than dump. A wide file otherwise fills the context window
  // with column names, which is slow to evaluate on CPU and a worse prompt.
  const context = buildPlanContext(profile, { nCtx });
  // The free-text answer is domain context for the prompt only. It never
  // reaches generated code, and it cannot widen what the plan may do.
  const payload = { ...context.payload };
  if (constraints?.notes) payload.context = constraints.notes;
  if (constraints?.columns?.length) payload.focus_columns = constraints.columns;
  if (constraints?.tasks?.length) payload.wanted = constraints.tasks;
  const userMessage = JSON.stringify(payload);
  record("plan.prompt", {
    chars: userMessage.length,
    tokens: context.tokens,
    shown: context.shown.length,
    omitted: context.omitted,
  });

  const result = await runGuarded({
    messages: [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: userMessage },
    ],
    schema: PLAN_SCHEMA,
    signal,
    onProgress,
    limits,
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
      return { ok: true, value: parsed };
    },
  });

  record("plan.result", { ok: result.ok, reason: result.reason, attempts: result.attempts.length });

  // validatePlan runs either way — it is the guarantee, not a formality.
  const plan = validatePlan(result.ok ? result.value : null, schema, constraints);
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
export function validatePlan(plan, schema, constraints = null) {
  const byName = new Map(schema.columns.map((c) => [c.name, c]));

  // The visitor's answers narrow the field before the model's choice is even
  // considered. If they said which columns matter, those are the only columns
  // eligible to be a target — otherwise the questions would be decorative.
  const chosen = constraints?.columns?.filter((n) => byName.has(n)) || [];
  const pool = chosen.length ? schema.columns.filter((c) => chosen.includes(c.name)) : schema.columns;

  const numeric = pool.filter((c) => c.type === "number" || c.type === "integer");
  const categorical = pool.filter((c) => c.type === "categorical" || c.type === "binary");

  // Charts are illustration, not the answer, so they may use any column. Only
  // the target is restricted to what the visitor chose — restricting charts too
  // meant picking one column produced exactly one chart.
  const allNumeric = schema.columns.filter((c) => c.type === "number" || c.type === "integer");
  const allCategorical = schema.columns.filter((c) => c.type === "categorical" || c.type === "binary");

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
    // Even with no plan from the model, the answers still decide the task —
    // they are the visitor's instruction, not a hint to the model.
    const wanted = constraints?.tasks?.[0];
    safe.task = wanted || "summary";
    safe.rationale = wanted
      ? "Based on what you chose."
      : "The model did not return a usable plan, so the data is summarised instead.";
    if (!wanted) {
      corrections.push("Fell back to a summary because the model returned no valid plan.");
    }
    if (safe.task === "regression") safe.target = numeric[0]?.name || allNumeric[0]?.name || null;
    if (safe.task === "classification") safe.target = categorical[0]?.name || allCategorical[0]?.name || null;
    if (safe.task !== "summary" && !safe.target) {
      corrections.push(`No suitable column for ${safe.task}; summarised instead.`);
      safe.task = "summary";
    }
    safe.features = schema.columns.filter((c) => c.name !== safe.target && c.type !== "identifier").map((c) => c.name);
    safe.charts = defaultCharts(allNumeric, allCategorical, safe.target);
    return safe;
  }

  safe.rationale = typeof plan.rationale === "string" ? plan.rationale.slice(0, 300) : "";

  let task = String(plan.task || "summary").toLowerCase();
  if (!(task in TASKS)) {
    corrections.push(`"${plan.task}" is not a supported task; used a summary instead.`);
    task = "summary";
  }

  // An explicit choice of intent overrides the model's.
  const allowed = constraints?.tasks;
  if (allowed?.length && !allowed.includes(task)) {
    corrections.push(`You asked for ${allowed.join(" or ")}, so ${task} was replaced.`);
    task = allowed[0];
  }

  let target = typeof plan.target === "string" && byName.has(plan.target) ? plan.target : null;
  if (plan.target && !target) {
    corrections.push(`Target "${plan.target}" is not a column in this file.`);
  }
  if (target && chosen.length && !chosen.includes(target)) {
    corrections.push(`"${target}" was not one of the columns you chose.`);
    target = null;
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

  if (!safe.charts.length) safe.charts = defaultCharts(allNumeric, allCategorical, target);

  safe.task = task;
  safe.target = target;
  return safe;
}

function defaultCharts(numeric, categorical, target = null) {
  const charts = [];
  const targetCol = numeric.find((c) => c.name === target) || categorical.find((c) => c.name === target);

  // Lead with the target: it is what the reader came for.
  if (targetCol) {
    charts.push(
      numeric.includes(targetCol)
        ? { type: "histogram", x: targetCol.name, y: null, title: `Distribution of ${targetCol.name}` }
        : { type: "bar", x: targetCol.name, y: null, title: `${targetCol.name} by count` }
    );
  }

  if (numeric[0] && !charts.some((c) => c.x === numeric[0].name)) {
    charts.push({ type: "histogram", x: numeric[0].name, y: null, title: `Distribution of ${numeric[0].name}` });
  }
  if (categorical[0] && !charts.some((c) => c.x === categorical[0].name)) {
    charts.push({ type: "bar", x: categorical[0].name, y: null, title: `${categorical[0].name} by count` });
  }
  if (numeric.length >= 2) {
    charts.push({
      type: "scatter",
      x: numeric[0].name,
      y: numeric[1].name,
      colorBy: categorical[0]?.name || null,
      title: `${numeric[1].name} against ${numeric[0].name}`,
    });
  }

  return charts.slice(0, 4);
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
