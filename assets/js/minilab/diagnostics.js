// Local-only diagnostics.
//
// The Mini-Lab tells visitors nothing is uploaded, so this records to memory
// and stays there. There is no beacon, no third party, and no network call.
// The visitor copies a report and sends it deliberately, or they do not.
//
// Nothing here may record file contents, column values, or file names. Those
// are the visitor's data; a bug report does not need them.

const MAX_EVENTS = 200;
const events = [];
const context = {};

let seq = 0;

export function setContext(patch) {
  Object.assign(context, patch);
}

export function record(kind, detail = {}) {
  events.push({
    n: (seq += 1),
    t: Math.round(performance.now()),
    kind,
    ...redact(detail),
  });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

export function recordError(where, error) {
  record("error", {
    where,
    name: error?.name || "Error",
    message: String(error?.message || error).slice(0, 400),
    stack: String(error?.stack || "")
      .split("\n")
      .slice(0, 6)
      .map((line) => line.trim().replace(/https?:\/\/[^\s)]+/g, (u) => new URL(u).pathname))
      .join(" | "),
  });
}

/** Strip anything that could carry the visitor's own data. */
function redact(detail) {
  const out = {};
  for (const [key, value] of Object.entries(detail)) {
    if (/name|file|path|value|column|content|row/i.test(key) && typeof value === "string") {
      out[key] = `<${value.length} chars>`;
    } else if (typeof value === "string") {
      out[key] = value.slice(0, 300);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function buildReport() {
  return {
    generated: new Date().toISOString(),
    page: location.pathname,
    userAgent: navigator.userAgent,
    language: navigator.language,
    context,
    events,
  };
}

export function reportText() {
  return JSON.stringify(buildReport(), null, 2);
}

/** Prefilled GitHub issue, truncated to stay inside a URL length that works. */
export function issueUrl(repo = "glp500/glp500.github.io") {
  const body = [
    "**What I was doing**",
    "",
    "(what you clicked, and what you expected)",
    "",
    "**Diagnostics**",
    "",
    "```json",
    reportText().slice(0, 5000),
    "```",
  ].join("\n");
  return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(
    "Mini-Lab: "
  )}&body=${encodeURIComponent(body)}`;
}

/** Route uncaught failures here so they surface in the panel, not just console. */
export function installGlobalHandlers() {
  window.addEventListener("error", (event) => {
    recordError("window.error", event.error || new Error(event.message));
  });
  window.addEventListener("unhandledrejection", (event) => {
    recordError("unhandledrejection", event.reason);
  });
}

export function eventCount() {
  return events.length;
}

export function errorCount() {
  return events.filter((e) => e.kind === "error").length;
}
