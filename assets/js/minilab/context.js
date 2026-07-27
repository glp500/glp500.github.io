// Context construction: deciding what the model is allowed to see.
//
// This is the retrieval half of the harness. The verification half rejects a
// bad answer; this half stops the model being asked an impossible question in
// the first place.
//
// The failure that motivated it: a 54-column file produced a 2,416-character
// schema, roughly 900 tokens once the field names and JSON punctuation are
// counted. Filling most of the context window with column names is both slow
// to evaluate on CPU and a worse prompt — the model has to find the two or
// three columns that matter inside a wall of noise.
//
// So the rule here is: select, rank, and budget. Never dump.

// JSON tokenizes badly — punctuation and field names fragment. Measured
// against Qwen-family tokenizers this is a safe conservative divisor.
const CHARS_PER_TOKEN = 3.0;

// Keep the prompt to a modest share of the window so prompt evaluation stays
// quick and there is ample room for the reply.
const PROMPT_BUDGET_RATIO = 0.3;

const MAX_COLUMNS_SHOWN = 14;

export function estimateTokens(text) {
  return Math.ceil(String(text).length / CHARS_PER_TOKEN);
}

/**
 * Score a column by how useful it is for choosing an analysis.
 *
 * Deterministic and explainable — no model involved. A column that is mostly
 * missing, or unique in every row, cannot be a useful target whatever the
 * model thinks.
 */
export function scoreColumn(column) {
  let score = 0;

  if (column.type === "number" || column.type === "integer") score += 3;
  else if (column.type === "categorical" || column.type === "binary") score += 3;
  else if (column.type === "date") score += 1;
  else if (column.type === "identifier") score -= 5; // never a target
  else score -= 1; // free text

  // Completeness matters more than anything else.
  score -= (column.missingPct || 0) / 20;

  // A categorical column with a sane number of levels is a good target;
  // hundreds of levels is not.
  if (column.type === "categorical") {
    if (column.unique >= 2 && column.unique <= 12) score += 2;
    else if (column.unique > 40) score -= 2;
  }

  // A constant column carries no information at all.
  if (column.unique <= 1) score -= 6;

  return score;
}

/**
 * Build the smallest prompt payload that still lets the model choose well.
 *
 * @returns {{payload: object, shown: string[], omitted: number, tokens: number}}
 */
export function buildPlanContext(profile, { nCtx = 4096, maxColumns = MAX_COLUMNS_SHOWN } = {}) {
  const usable = profile.columns
    .map((c) => ({ column: c, score: scoreColumn(c) }))
    .filter((e) => e.score > -4) // identifiers, constants, free text
    .sort((a, b) => b.score - a.score);

  const isNumeric = (c) => c.type === "number" || c.type === "integer";
  const isCategorical = (c) => c.type === "categorical" || c.type === "binary";

  // Select by type quota, not by raw score.
  //
  // Scoring alone hands every slot to whichever type happens to score higher —
  // in testing, 14 categorical columns and not one numeric, which makes
  // regression and correlation impossible to choose however good the model is.
  // The model must see both kinds to pick between tasks.
  const numeric = usable.filter((e) => isNumeric(e.column));
  const categorical = usable.filter((e) => isCategorical(e.column));
  const other = usable.filter((e) => !isNumeric(e.column) && !isCategorical(e.column));

  const half = Math.floor(maxColumns / 2);
  const picked = [
    ...numeric.slice(0, half),
    ...categorical.slice(0, maxColumns - half),
  ];
  // Backfill if one type was scarce.
  for (const pool of [numeric.slice(half), categorical.slice(maxColumns - half), other]) {
    for (const entry of pool) {
      if (picked.length >= maxColumns) break;
      picked.push(entry);
    }
  }

  // Trim to the token budget, dropping the lowest-scoring first.
  const budgetTokens = Math.floor(nCtx * PROMPT_BUDGET_RATIO);
  picked.sort((a, b) => b.score - a.score);
  let chosen = picked.map((e) => e.column);
  while (chosen.length > 1 && estimateTokens(JSON.stringify(describe(chosen))) > budgetTokens) {
    chosen.pop();
  }

  // Restore the file's own column order so the list reads naturally.
  const order = new Map(profile.columns.map((c, i) => [c.name, i]));
  chosen = chosen.sort((a, b) => order.get(a.name) - order.get(b.name));

  const payload = {
    rows: profile.rowCount,
    total_columns: profile.columnCount,
    columns: describe(chosen),
  };
  if (chosen.length < profile.columnCount) {
    payload.note = `${profile.columnCount - chosen.length} further columns omitted as unsuitable targets`;
  }

  return {
    payload,
    shown: chosen.map((c) => c.name),
    omitted: profile.columnCount - chosen.length,
    tokens: estimateTokens(JSON.stringify(payload)),
  };
}

function describe(columns) {
  return columns.map((c) => ({ name: c.name, type: c.type }));
}
