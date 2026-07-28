// File ingest and deterministic profiling.
//
// Everything here runs on values, not on a language model. The profile it
// produces is the only thing the model is ever shown, and every number that
// reaches the report comes from this code or from Pyodide — never from the
// model itself.

const TEXT_TYPES = /\.(csv|tsv|txt)$/i;
const SHEET_TYPES = /\.(xlsx|xls)$/i;

// Caps so a very large file cannot wedge the browser. Profiling is O(rows ×
// columns) on the main thread, and past these sizes the page stops responding
// long before the analysis is interesting.
export const MAX_FILE_BYTES_IN = 64 * 1024 * 1024;
export const MAX_ROWS = 200_000;
export const MAX_COLUMNS = 512;

export class IngestError extends Error {}

export async function readTable(file) {
  if (file.size > MAX_FILE_BYTES_IN) {
    throw new IngestError(
      `That file is ${(file.size / 1024 ** 2).toFixed(0)} MB. The Mini-Lab reads up to ${
        MAX_FILE_BYTES_IN / 1024 ** 2
      } MB in the browser. Take a sample of it first.`
    );
  }
  return readTableInner(file);
}

async function readTableInner(file) {
  if (SHEET_TYPES.test(file.name)) return readSpreadsheet(file);
  if (TEXT_TYPES.test(file.name)) return readDelimited(file);
  throw new IngestError(
    `${file.name} is not a supported table. Use .csv, .tsv, .txt, .xlsx or .xls.`
  );
}

async function readDelimited(file) {
  const text = await file.text();
  if (!text.trim()) throw new IngestError(`${file.name} is empty.`);
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (rows.length < 2) throw new IngestError(`${file.name} has no data rows.`);
  return toTable(rows, file.name);
}

async function readSpreadsheet(file) {
  // SheetJS is only needed for spreadsheets, so it is loaded on demand.
  const XLSX = await import("../vendor/xlsx/xlsx.mjs");
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array" });
  const sheetName = book.SheetNames[0];
  if (!sheetName) throw new IngestError(`${file.name} has no sheets.`);
  const rows = XLSX.utils.sheet_to_json(book.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (rows.length < 2) throw new IngestError(`${file.name} has no data rows.`);
  return toTable(rows.map((r) => r.map((c) => String(c ?? ""))), file.name);
}

function detectDelimiter(text) {
  const line = text.slice(0, 5000).split(/\r?\n/)[0] || "";
  const counts = [
    [",", (line.match(/,/g) || []).length],
    ["\t", (line.match(/\t/g) || []).length],
    [";", (line.match(/;/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/** RFC 4180 parser: handles quoted fields, embedded delimiters and newlines. */
function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

function toTable(rows, name) {
  const header = rows[0]
    .slice(0, MAX_COLUMNS)
    .map((h, i) => String(h).trim() || `column_${i + 1}`);
  const truncatedColumns = rows[0].length > MAX_COLUMNS;
  const dataRows = rows.slice(1, MAX_ROWS + 1);
  const truncatedRows = rows.length - 1 > MAX_ROWS;
  const body = dataRows.map((r) => {
    const out = {};
    header.forEach((key, i) => {
      out[key] = r[i] ?? "";
    });
    return out;
  });
  return {
    name,
    columns: header,
    rows: body,
    truncated: truncatedRows || truncatedColumns,
    truncatedRows,
    truncatedColumns,
  };
}

// ---------------------------------------------------------------------------
// Profiling
// ---------------------------------------------------------------------------

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "-", "?"]);

export function profileTable(table) {
  const total = table.rows.length;
  const columns = table.columns.map((name) => profileColumn(name, table.rows, total));
  return {
    name: table.name,
    rowCount: total,
    columnCount: columns.length,
    columns,
  };
}

function profileColumn(name, rows, total) {
  const raw = rows.map((r) => (r[name] ?? "").toString().trim());
  const present = raw.filter((v) => !MISSING.has(v.toLowerCase()));
  const missing = total - present.length;
  const unique = new Set(present);

  const numeric = present.map(toNumber).filter((n) => n !== null);
  const numericRatio = present.length ? numeric.length / present.length : 0;
  const dateLike = present.filter(isDateLike).length;
  const dateRatio = present.length ? dateLike / present.length : 0;

  let type = "text";
  if (numericRatio >= 0.9 && numeric.length) {
    type = numeric.every((n) => Number.isInteger(n)) ? "integer" : "number";
  } else if (dateRatio >= 0.8) {
    type = "date";
  } else if (unique.size <= Math.max(2, Math.min(20, present.length * 0.25))) {
    type = "categorical";
  }
  if (unique.size === present.length && present.length > 0 && type === "text") {
    type = "identifier";
  }
  if (unique.size <= 2 && present.length > 0) type = "binary";

  const column = {
    name,
    type,
    missing,
    missingPct: total ? Math.round((missing / total) * 1000) / 10 : 0,
    unique: unique.size,
    examples: [...unique].slice(0, 3),
  };

  if (type === "number" || type === "integer") {
    numeric.sort((a, b) => a - b);
    const sum = numeric.reduce((a, b) => a + b, 0);
    const mean = sum / numeric.length;
    column.stats = {
      min: round(numeric[0]),
      max: round(numeric[numeric.length - 1]),
      mean: round(mean),
      median: round(quantile(numeric, 0.5)),
      std: round(Math.sqrt(numeric.reduce((a, b) => a + (b - mean) ** 2, 0) / numeric.length)),
    };
  }

  if (type === "categorical" || type === "binary") {
    const counts = new Map();
    present.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
    column.topValues = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
  }

  return column;
}

function toNumber(value) {
  if (value === "") return null;
  const cleaned = value.replace(/[\s,_]/g, "").replace(/^([£$€])/, "");
  if (!/^-?\d*\.?\d+(e-?\d+)?%?$/i.test(cleaned)) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isDateLike(value) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value)) return true;
  return false;
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function round(n) {
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs >= 1000) return Math.round(n);
  if (abs >= 1) return Math.round(n * 100) / 100;
  return Math.round(n * 10000) / 10000;
}

/**
 * Compact schema summary for the model. Deliberately excludes raw rows: the
 * model sees structure and statistics, never the data itself.
 */
export function schemaForModel(profile) {
  return {
    rows: profile.rowCount,
    columns: profile.columns.map((c) => ({
      name: c.name,
      type: c.type,
      missing_pct: c.missingPct,
      unique: c.unique,
      ...(c.stats ? { min: c.stats.min, max: c.stats.max, mean: c.stats.mean } : {}),
      ...(c.topValues ? { top_values: c.topValues.map((t) => t.value) } : {}),
    })),
  };
}
