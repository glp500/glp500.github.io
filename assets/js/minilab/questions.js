// The guided questions asked between dropping a file and running the analysis.
//
// Three multiple-choice questions with four options each, multi-select, plus one
// free-text field. Built from the column profile, so they name real columns.
//
// The model does not write these. It used to, and the merge step then threw away
// everything except the wording: the column options had to be real column names
// whatever the model returned, and the intent options map to tasks *by index* —
// so a model that reordered them silently mislabelled the analysis. A hundred
// lines of prompt, schema, validation and reconciliation that could only
// rephrase a question is not worth that failure mode.
//
// The answers are not decoration. They become hard constraints on the plan in
// analysis.js, which is what stops the model defaulting to "descriptive
// summary" for every file.

/** Intent options map to analysis tasks by position; that mapping is ours. */
export const INTENT_TASKS = {
  0: "summary",
  1: "correlation",
  2: "classification",
  3: "regression",
};

/**
 * The questions for one file.
 *
 * @returns {Array<{id: string, question: string, options: string[]}>}
 */
export function buildQuestions(profile) {
  const numeric = profile.columns.filter((c) => c.type === "number" || c.type === "integer");
  const categorical = profile.columns.filter(
    (c) => c.type === "categorical" || c.type === "binary"
  );

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

  const tasks = (answers.intent || []).map((i) => INTENT_TASKS[i]).filter(Boolean);

  const columnsQuestion = get("columns");
  const columns = (answers.columns || [])
    .map((i) => columnsQuestion?.options?.[i])
    .filter(Boolean);

  const outputQuestion = get("output");
  const presentation = (answers.output || [])
    .map((i) => outputQuestion?.options?.[i])
    .filter(Boolean)
    .join(", ");

  return {
    tasks: tasks.length ? tasks : null,
    columns,
    notes: String(answers.notes || "").slice(0, 300),
    presentation,
  };
}
