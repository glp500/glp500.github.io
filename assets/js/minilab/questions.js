// The guided questions asked between dropping a file and running the analysis.
//
// Three multiple-choice questions with four options each, multi-select, plus
// one free-text field. The model writes them from the column context so they
// name real columns; a deterministic fallback of the same shape covers a slow
// machine, a refusal, or a cancel — the UI says which was used.
//
// The answers are not decoration. They become hard constraints on the plan in
// analysis.js, which is what stops the model defaulting to "descriptive
// summary" for every file.

import { runGuarded } from "./harness.js";
import { buildPlanContext } from "./context.js";
import { record } from "./diagnostics.js";

export const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["intent", "columns", "output"] },
          question: { type: "string", maxLength: 90 },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string", maxLength: 48 },
          },
        },
        required: ["id", "question", "options"],
      },
    },
  },
  required: ["questions"],
};

const SYSTEM = `Write 3 multiple-choice questions to find out what someone wants from their data.
Reply with only JSON: {"questions":[{"id":"intent","question":"...","options":["a","b","c","d"]},{"id":"columns",...},{"id":"output",...}]}
Question ids in order: intent (what they want to learn), columns (which columns matter — use real column names from the schema), output (what the result is for).
Exactly 4 short options each.`;

/**
 * Ask the model to write the questions, falling back to a deterministic set.
 * @returns {{questions: Array, source: "model"|"fallback", reason: string}}
 */
export async function buildQuestions(profile, { signal, onProgress, nCtx = 4096, limits = {} } = {}) {
  const fallback = fallbackQuestions(profile);
  const context = buildPlanContext(profile, { nCtx });

  const result = await runGuarded({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify(context.payload) },
    ],
    schema: QUESTION_SCHEMA,
    signal,
    onProgress,
    limits,
    validate: (parsed) => {
      const qs = parsed?.questions;
      if (!Array.isArray(qs) || qs.length !== 3) {
        return { ok: false, error: "Return exactly 3 questions." };
      }
      const ids = qs.map((q) => q?.id);
      for (const required of ["intent", "columns", "output"]) {
        if (!ids.includes(required)) {
          return { ok: false, error: `Missing the "${required}" question.` };
        }
      }
      for (const q of qs) {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          return { ok: false, error: "Each question needs a title and exactly 4 options." };
        }
      }
      return { ok: true, value: qs };
    },
  });

  record("questions.result", { ok: result.ok, reason: result.reason, attempts: result.attempts.length });

  if (!result.ok) {
    return { questions: fallback, source: "fallback", reason: result.reason };
  }

  // Merge: keep the model's wording, but guarantee the machinery each question
  // needs — the intent options must map to tasks, and the column options must
  // be real column names, whatever the model wrote.
  return { questions: reconcile(result.value, fallback, profile), source: "model", reason: "ok" };
}

/** Intent options map to analysis tasks; that mapping is ours, not the model's. */
export const INTENT_TASKS = {
  0: "summary",
  1: "correlation",
  2: "classification",
  3: "regression",
};

function reconcile(modelQuestions, fallback, profile) {
  const byId = new Map(modelQuestions.map((q) => [q.id, q]));
  const names = new Set(profile.columns.map((c) => c.name));

  return fallback.map((base) => {
    const written = byId.get(base.id);
    if (!written) return base;

    // The columns question must offer real columns. A model that invents names
    // here would produce a question nobody can answer usefully.
    if (base.id === "columns") {
      const valid = written.options.filter((o) => names.has(o));
      return valid.length === 4 ? { ...base, question: written.question, options: valid } : base;
    }

    return { ...base, question: written.question, options: written.options };
  });
}

/**
 * Deterministic questions, built from the profile. Same shape as the model's,
 * so the rest of the pipeline cannot tell them apart.
 */
export function fallbackQuestions(profile) {
  const numeric = profile.columns.filter((c) => c.type === "number" || c.type === "integer");
  const categorical = profile.columns.filter((c) => c.type === "categorical" || c.type === "binary");

  // Offer the most usable columns, mixing types so any task stays reachable.
  const picks = [];
  for (let i = 0; i < 4; i += 1) {
    const source = i % 2 === 0 ? numeric : categorical;
    const candidate = source[Math.floor(i / 2)];
    if (candidate && !picks.includes(candidate.name)) picks.push(candidate.name);
  }
  for (const c of profile.columns) {
    if (picks.length >= 4) break;
    if (!picks.includes(c.name) && c.type !== "identifier") picks.push(c.name);
  }

  return [
    {
      id: "intent",
      question: "What do you want to find out?",
      options: [
        "Describe what is in the data",
        "Find relationships between measures",
        "Compare groups against each other",
        "Predict one column from the others",
      ],
    },
    {
      id: "columns",
      question: "Which columns matter most?",
      options: picks.slice(0, 4),
    },
    {
      id: "output",
      question: "What is this for?",
      options: ["A quick look", "A figure for a report", "A presentation", "Something to hand off"],
    },
  ];
}

/**
 * Turn selections into constraints the planner must respect.
 *
 * @param {object} answers {intent:number[], columns:number[], output:number[], notes:string}
 * @returns {{tasks: string[]|null, columns: string[], notes: string, presentation: string}}
 */
export function answersToConstraints(answers, questions) {
  const get = (id) => questions.find((q) => q.id === id);

  const intentIdx = answers.intent || [];
  const tasks = intentIdx.map((i) => INTENT_TASKS[i]).filter(Boolean);

  const columnsQuestion = get("columns");
  const columns = (answers.columns || [])
    .map((i) => columnsQuestion?.options?.[i])
    .filter(Boolean);

  const outputQuestion = get("output");
  const presentation = (answers.output || []).map((i) => outputQuestion?.options?.[i]).filter(Boolean).join(", ");

  return {
    tasks: tasks.length ? tasks : null,
    columns,
    notes: String(answers.notes || "").slice(0, 300),
    presentation,
  };
}
