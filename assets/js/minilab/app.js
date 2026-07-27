// Mini-Lab controller.
//
// Loaded only on /mini-lab/ (see the dynamic import in the page), so no other
// route pays for any of this.

import { probeHardware, evaluateModel, recommendModel, formatBytes } from "./hardware.js";
import { loadModel, unloadModel, loadedModelId, supportsConstraint } from "./runtime.js";
import { ensureIsolation } from "./coi.js";
import {
  record,
  recordError,
  setContext,
  reportText,
  issueUrl,
  installGlobalHandlers,
  errorCount,
  eventCount,
} from "./diagnostics.js";
import { searchRepos, resolveRepo } from "./hf.js";
import { readTable, profileTable, schemaForModel, IngestError } from "./ingest.js";
import { planAnalysis, validatePlan, runAnalysis } from "./analysis.js";
import { renderChart } from "./charts.js";
import { buildPython, buildRequirements } from "./export.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  hardware: null,
  catalogue: [],
  selected: null,
  loading: false,
  table: null,
  profile: null,
  plan: null,
  results: null,
  abort: null,
  analysing: false,
  analysisAbort: null,
  isolation: null,
};

export async function init(root) {
  // The catalogue is emitted by Jekyll as a JSON script tag outside the
  // panel root, so it is looked up on the document rather than in `root`.
  const catalogueNode = document.getElementById("minilab-models");
  if (!catalogueNode) throw new Error("Model catalogue is missing from the page.");
  state.catalogue = JSON.parse(catalogueNode.textContent);

  installGlobalHandlers();
  bindPanels(root);
  bindDiagnostics(root);

  // Cross-origin isolation unlocks multi-threaded WebAssembly, which is the
  // largest single throughput factor on a machine without WebGPU. It needs one
  // reload to take effect, so say why before the page goes.
  const isolation = await ensureIsolation({
    onReload: () => {
      const target = $("[data-hardware]", root);
      if (target) {
        target.innerHTML = '<p class="ml-status">Enabling multi-threading — reloading once…</p>';
      }
    },
  });
  state.isolation = isolation;
  record("coi", { state: isolation.state, isolated: isolation.isolated });
  if (isolation.state === "reloading") return; // page is about to navigate

  const hw = await probeHardware();
  state.hardware = hw;
  setContext({
    webgpu: hw.webgpu,
    gpu: hw.gpuName,
    threads: hw.threads,
    isolated: hw.crossOriginIsolated,
    budgetBytes: hw.budgetBytes,
    coi: isolation.state,
  });
  record("hardware", { webgpu: hw.webgpu, threads: hw.threads, tier: hw.tier });

  renderHardware(root, hw);
  renderCatalogue(root);
  bindModelControls(root);
  bindDataControls(root);
  renderDiagnostics(root);
}

// --- panel switching -------------------------------------------------------

function bindPanels(root) {
  $$("[data-panel-button]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.panelButton;
      $$("[data-panel-button]", root).forEach((b) =>
        b.classList.toggle("is-active", b === button)
      );
      $$("[data-panel]", root).forEach((p) => {
        p.hidden = p.dataset.panel !== name;
      });
    });
  });
}

// --- hardware --------------------------------------------------------------

function renderHardware(root, hw) {
  const target = $("[data-hardware]", root);
  const iso = state.isolation || {};
  const rows = [
    ["GPU", hw.webgpu ? hw.gpuName : "None — running on CPU"],
    ["Threads", hw.crossOriginIsolated ? `${hw.threads}` : "1"],
    ["Room for", formatBytes(hw.budgetBytes)],
  ];

  const notes = [...hw.notes];
  if (!hw.crossOriginIsolated && iso.detail) notes.push(iso.detail);
  notes.push(...browserAdvice(hw));

  target.innerHTML = `
    <dl class="ml-facts">
      ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}
    </dl>
    ${notes.length ? `<ul class="ml-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}`;
}

/**
 * Say what is actually true for this browser rather than a generic warning.
 * Firefox on Linux still has WebGPU behind a flag, which is the difference
 * between seconds and minutes per reply.
 */
function browserAdvice(hw) {
  if (hw.webgpu) return [];
  const ua = navigator.userAgent;
  const isFirefox = /firefox/i.test(ua);
  const isLinux = /linux/i.test(ua) && !/android/i.test(ua);
  const advice = [];

  if (isFirefox) {
    advice.push(
      isLinux
        ? 'Firefox on Linux ships WebGPU disabled. Try <code>dom.webgpu.enabled</code> in <code>about:config</code>; Chrome will be faster today.'
        : 'Firefox needs <code>dom.webgpu.enabled</code> in <code>about:config</code> for GPU inference.'
    );
  } else if (/safari/i.test(ua) && !/chrome|chromium/i.test(ua)) {
    advice.push("Safari's WebGPU support is partial. Chrome gives the best results here.");
  } else {
    advice.push("A browser with WebGPU (Chrome or Edge) will be substantially faster.");
  }

  advice.push("Without a GPU, start with the smallest model — it is the difference between seconds and minutes.");
  return advice;
}

// --- diagnostics -----------------------------------------------------------

function bindDiagnostics(root) {
  $("[data-copy-diagnostics]", root)?.addEventListener("click", async (event) => {
    const button = event.target;
    const label = button.textContent;
    try {
      await navigator.clipboard.writeText(reportText());
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy blocked";
    }
    setTimeout(() => {
      button.textContent = label;
    }, 1600);
  });
}

function renderDiagnostics(root) {
  const summary = $("[data-diagnostics-summary]", root);
  const link = $("[data-issue-link]", root);
  if (!summary) return;
  const errors = errorCount();
  summary.textContent = errors
    ? `${eventCount()} events · ${errors} error${errors === 1 ? "" : "s"}`
    : `${eventCount()} events`;
  summary.classList.toggle("has-errors", errors > 0);
  if (link) link.href = issueUrl();
}

// --- model picker ----------------------------------------------------------

function renderCatalogue(root) {
  const hw = state.hardware;
  const list = $("[data-models]", root);
  const recommended = recommendModel(state.catalogue, hw);

  list.innerHTML = state.catalogue
    .map((model) => {
      const verdict = evaluateModel(model, hw);
      const isRecommended = recommended && model.id === recommended.id;
      return `
      <li class="ml-model${verdict.ok ? "" : " is-blocked"}">
        <label>
          <input type="radio" name="minilab-model" value="${model.id}"
            ${verdict.ok ? "" : "disabled"}
            ${isRecommended ? "checked" : ""}>
          <span class="ml-model__name">${escapeHtml(model.label)}${
            isRecommended ? ' <em class="ml-badge">Recommended</em>' : ""
          }</span>
          <span class="ml-model__size">${formatBytes(model.size_bytes)}</span>
          ${
            verdict.ok
              ? ""
              : `<span class="ml-model__note">${escapeHtml(verdict.reason)}</span>`
          }
        </label>
      </li>`;
    })
    .join("");

  if (recommended) state.selected = recommended;
  updateLoadButton(root);

  list.addEventListener("change", (event) => {
    const id = event.target.value;
    state.selected =
      state.catalogue.find((m) => m.id === id) ||
      state.custom?.find?.((m) => m.id === id) ||
      state.selected;
    updateLoadButton(root);
  });
}

function markModelReady(root, ready) {
  const run = $("[data-run-analysis]", root);
  if (!run) return;
  run.textContent = ready ? "Analyse with the model" : "Analyse";
}

function updateLoadButton(root) {
  const button = $("[data-load-model]", root);
  if (!state.selected) {
    button.disabled = true;
    button.textContent = "No model can run here";
    return;
  }
  button.disabled = state.loading;
  button.textContent = state.loading ? "Loading…" : `Load ${state.selected.label}`;
}

function bindModelControls(root) {
  $("[data-load-model]", root).addEventListener("click", () => startLoad(root));
  $("[data-cancel-model]", root).addEventListener("click", () => state.abort?.abort());

  const searchInput = $("[data-hf-search]", root);
  const searchButton = $("[data-hf-search-go]", root);
  const results = $("[data-hf-results]", root);

  const doSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    results.innerHTML = "<p>Searching Hugging Face…</p>";
    try {
      const repos = await searchRepos(query);
      if (!repos.length) {
        results.innerHTML = "<p>No GGUF repositories matched that search.</p>";
        return;
      }
      results.innerHTML = `<ul class="ml-hf-list">${repos
        .map(
          (r) =>
            `<li><button type="button" data-hf-pick="${escapeHtml(r.repo)}">${escapeHtml(
              r.repo
            )}</button> <span>${r.downloads.toLocaleString()} downloads</span></li>`
        )
        .join("")}</ul>`;
    } catch (error) {
      results.innerHTML = `<p class="ml-error">${escapeHtml(error.message)}</p>`;
    }
  };

  searchButton.addEventListener("click", doSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  results.addEventListener("click", (event) => {
    const repo = event.target.dataset?.hfPick;
    if (repo) useRepo(root, repo);
  });

  $("[data-hf-load]", root).addEventListener("click", () => {
    const repo = $("[data-hf-repo]", root).value.trim();
    if (repo) useRepo(root, repo);
  });
}

async function useRepo(root, repo) {
  const status = $("[data-hf-status]", root);
  status.textContent = `Checking ${repo}…`;
  try {
    const model = await resolveRepo(repo, state.hardware.budgetBytes);
    state.custom = [...(state.custom || []), model];
    state.selected = model;
    status.innerHTML = `Selected <strong>${escapeHtml(model.label)}</strong> — ${escapeHtml(
      model.file
    )} (${formatBytes(model.size_bytes)}).`;
    $$('input[name="minilab-model"]', root).forEach((i) => {
      i.checked = false;
    });
    updateLoadButton(root);
  } catch (error) {
    status.innerHTML = `<span class="ml-error">${escapeHtml(error.message)}</span>`;
  }
}

async function startLoad(root) {
  if (!state.selected || state.loading) return;
  const progress = $("[data-model-progress]", root);
  const cancel = $("[data-cancel-model]", root);

  state.loading = true;
  state.abort = new AbortController();
  cancel.hidden = false;
  updateLoadButton(root);

  const started = performance.now();
  try {
    await loadModel(state.selected, state.hardware, {
      signal: state.abort.signal,
      onStage: (stage) => {
        progress.textContent = stage;
      },
      onProgress: ({ loaded, total }) => {
        if (!total) return;
        const pct = Math.round((loaded / total) * 100);
        const seconds = (performance.now() - started) / 1000;
        const rate = loaded / Math.max(seconds, 0.1);
        const remaining = rate > 0 ? (total - loaded) / rate : 0;
        progress.textContent = `${pct}% · ${formatBytes(loaded)} of ${formatBytes(
          total
        )} · ${formatBytes(rate)}/s · ${formatTime(remaining)} left`;
      },
    });
    progress.textContent = `${state.selected.label} is running on this machine.`;
    markModelReady(root, true);
  } catch (error) {
    progress.innerHTML =
      error?.name === "AbortError"
        ? "Download cancelled."
        : `<span class="ml-error">${escapeHtml(error.message)}</span>`;
    await unloadModel();
  } finally {
    state.loading = false;
    state.abort = null;
    cancel.hidden = true;
    updateLoadButton(root);
  }
}

// --- data application ------------------------------------------------------

function bindDataControls(root) {
  const drop = $("[data-dropzone]", root);
  const input = $("[data-file-input]", root);

  drop.addEventListener("click", () => input.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  ["dragenter", "dragover"].forEach((type) =>
    drop.addEventListener(type, (e) => {
      e.preventDefault();
      drop.classList.add("is-over");
    })
  );
  ["dragleave", "drop"].forEach((type) =>
    drop.addEventListener(type, (e) => {
      e.preventDefault();
      drop.classList.remove("is-over");
    })
  );
  drop.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(root, file);
  });
  input.addEventListener("change", () => {
    if (input.files?.[0]) handleFile(root, input.files[0]);
  });

  $("[data-run-analysis]", root).addEventListener("click", () => runPipeline(root));
  $("[data-cancel-analysis]", root).addEventListener("click", () => state.analysisAbort?.abort());
  $("[data-copy-code]", root).addEventListener("click", async (event) => {
    const code = $("[data-code-output]", root).textContent;
    try {
      await navigator.clipboard.writeText(code);
      const button = event.target;
      const label = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = label;
      }, 1600);
    } catch {
      /* clipboard blocked; the code is on screen regardless */
    }
  });
}

async function handleFile(root, file) {
  const status = $("[data-file-status]", root);
  status.textContent = `Reading ${file.name}…`;
  try {
    const table = await readTable(file);
    const profile = profileTable(table);
    state.table = table;
    state.profile = profile;
    record("ingest", { rows: profile.rowCount, columns: profile.columnCount, truncated: !!table.truncated });
    const truncNote = table.truncated
      ? ` Only the first ${profile.rowCount.toLocaleString()} rows were read.`
      : "";
    status.innerHTML = `<strong>${escapeHtml(file.name)}</strong> — ${profile.rowCount.toLocaleString()} rows × ${
      profile.columnCount
    } columns. Nothing was uploaded.${truncNote}`;
    renderProfile(root, profile);
    $("[data-analysis-step]", root).hidden = false;
    $("[data-run-analysis]", root).disabled = false;
    markModelReady(root, Boolean(loadedModelId()));
  } catch (error) {
    if (!(error instanceof IngestError)) recordError("ingest", error);
    status.innerHTML = `<span class="ml-error">${escapeHtml(
      error instanceof IngestError ? error.message : `Could not read that file: ${error.message}`
    )}</span>`;
    renderDiagnostics(root);
  }
}

function renderProfile(root, profile) {
  const target = $("[data-profile]", root);
  target.hidden = false;
  target.innerHTML = `
    <div class="ml-table-scroll">
      <table class="ml-table">
        <thead><tr><th>Column</th><th>Type</th><th>Missing</th><th>Unique</th><th>Range / values</th></tr></thead>
        <tbody>
          ${profile.columns
            .map(
              (c) => `<tr>
            <td>${escapeHtml(c.name)}</td>
            <td>${c.type}</td>
            <td>${c.missingPct}%</td>
            <td>${c.unique.toLocaleString()}</td>
            <td>${escapeHtml(describeColumn(c))}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function describeColumn(c) {
  if (c.stats) return `${c.stats.min} – ${c.stats.max} (mean ${c.stats.mean})`;
  if (c.topValues) return c.topValues.map((t) => `${t.value} (${t.count})`).join(", ");
  return c.examples.join(", ");
}

async function runPipeline(root) {
  if (!state.table || state.analysing) return;

  const status = $("[data-analysis-status]", root);
  const output = $("[data-analysis-output]", root);
  const runButton = $("[data-run-analysis]", root);
  const cancelButton = $("[data-cancel-analysis]", root);

  state.analysing = true;
  state.analysisAbort = new AbortController();
  runButton.disabled = true;
  cancelButton.hidden = false;
  output.hidden = true;

  const schema = schemaForModel(state.profile);
  let plan = null;
  let note = "";

  try {
    if (loadedModelId()) {
      const began = performance.now();
      status.textContent = "The model is choosing an analysis…";

      const outcome = await planAnalysis(schema, {
        signal: state.analysisAbort.signal,
        onProgress: ({ attempt, tokens, thinking, rate, elapsedMs, phase }) => {
          const suffix = attempt > 1 ? ` · retry ${attempt - 1}` : "";
          const seconds = Math.round(elapsedMs / 1000);
          status.textContent =
            phase === "thinking"
              ? `Reasoning — ${thinking} tokens · ${seconds}s${suffix}`
              : `Writing — ${tokens} tokens · ${rate.toFixed(1)}/s · ${seconds}s${suffix}`;
        },
      });

      plan = outcome.plan;
      record("analysis.plan", {
        source: outcome.source,
        reason: outcome.reason,
        ms: Math.round(performance.now() - began),
      });

      if (outcome.source === "fallback") {
        note = FALLBACK_NOTES[outcome.reason] || "The model did not return a usable plan.";
      }
    } else {
      plan = validatePlan(null, schema);
      note = "No model loaded, so the default analysis was used.";
    }
  } catch (error) {
    recordError("runPipeline.plan", error);
    plan = validatePlan(null, schema);
    note = "Planning failed, so the default analysis was used.";
  }

  try {
    status.textContent = "Computing…";
    const results = runAnalysis(state.table, state.profile, plan);
    state.plan = plan;
    state.results = results;
    renderResults(root, plan, results);
    output.hidden = false;
    status.textContent = note ? `Computed from your file. ${note}` : "Computed from your file.";
  } catch (error) {
    // Computation is deterministic, so this should not happen — but if it
    // does, say so rather than leaving a spinner running forever.
    recordError("runPipeline.compute", error);
    status.innerHTML = `<span class="ml-error">Could not complete the analysis. See diagnostics below.</span>`;
  } finally {
    // The defect that stranded the page: without this, any failure above left
    // the button disabled and the status frozen, with no way to retry.
    state.analysing = false;
    state.analysisAbort = null;
    runButton.disabled = false;
    cancelButton.hidden = true;
    renderDiagnostics(root);
  }
}

const FALLBACK_NOTES = {
  cancelled: "You stopped the model, so the default analysis was used.",
  deadline: "The model ran out of time, so the default analysis was used.",
  "too-slow": "This machine is too slow for the model to plan in time, so the default was used.",
  "no-budget": "The time budget ran out, so the default analysis was used.",
  unparseable: "The model did not return usable JSON, so the default analysis was used.",
  invalid: "The model's plan did not match your columns, so the default analysis was used.",
};

function renderResults(root, plan, results) {
  const charts = plan.charts
    .map((spec) => renderChart(spec, state.table))
    .filter(Boolean)
    .join("");

  $("[data-plan]", root).innerHTML = `
    <p class="ml-plan"><strong>${escapeHtml(labelForTask(plan.task))}</strong>${
      plan.target ? ` — target <code>${escapeHtml(plan.target)}</code>` : ""
    }</p>
    ${plan.rationale ? `<p class="ml-rationale">${escapeHtml(plan.rationale)}</p>` : ""}
    ${
      plan.corrections.length
        ? `<details class="ml-corrections"><summary>${plan.corrections.length} correction${
            plan.corrections.length === 1 ? "" : "s"
          } applied to the model's plan</summary><ul>${plan.corrections
            .map((c) => `<li>${escapeHtml(c)}</li>`)
            .join("")}</ul></details>`
        : ""
    }`;

  $("[data-charts]", root).innerHTML = charts || "<p>No chart suited these columns.</p>";
  $("[data-metrics]", root).innerHTML = renderMetrics(results);

  const code = buildPython(plan, state.profile, state.table.name);
  $("[data-code-output]", root).textContent = code;
  $("[data-requirements]", root).textContent = buildRequirements({
    ...plan,
    fileName: state.table.name,
  });
}

function labelForTask(task) {
  return {
    summary: "Descriptive summary",
    correlation: "Correlation analysis",
    classification: "Classification",
    regression: "Regression",
  }[task];
}

function renderMetrics(results) {
  const parts = [];
  const m = results.metrics || {};

  if (results.task === "classification" && m.classes) {
    parts.push(`<dl class="ml-facts">
      <div><dt>Classes</dt><dd>${m.classes}</dd></div>
      <div><dt>Labelled rows</dt><dd>${m.total.toLocaleString()}</dd></div>
      <div><dt>Majority class</dt><dd>${escapeHtml(String(m.majorityClass))}</dd></div>
      <div><dt>Baseline accuracy</dt><dd>${(m.majorityBaseline * 100).toFixed(1)}%</dd></div>
    </dl>
    <p class="ml-caveat">Any model must beat the baseline to be worth using. Training runs in the exported script, not in the browser.</p>`);
  }

  if (results.task === "regression" && m.n) {
    parts.push(`<dl class="ml-facts">
      <div><dt>Rows</dt><dd>${m.n.toLocaleString()}</dd></div>
      <div><dt>Target mean</dt><dd>${m.targetMean}</dd></div>
      <div><dt>Target sd</dt><dd>${m.targetStd}</dd></div>
    </dl>`);
    if (m.strongestPredictors?.length) {
      parts.push(`<h4>Strongest linear relationships</h4><ul class="ml-list">${m.strongestPredictors
        .map((p) => `<li><code>${escapeHtml(p.feature)}</code> r = ${p.r}</li>`)
        .join("")}</ul>
        <p class="ml-caveat">Correlation only. It does not establish that one causes the other.</p>`);
    }
  }

  (results.tables || []).forEach((t) => {
    if (!t.matrix) return;
    const { names, values } = t.matrix;
    parts.push(`<h4>${escapeHtml(t.title)}</h4>
      <div class="ml-table-scroll"><table class="ml-table ml-matrix">
        <thead><tr><th></th>${names.map((n) => `<th>${escapeHtml(n)}</th>`).join("")}</tr></thead>
        <tbody>${values
          .map(
            (row, i) =>
              `<tr><th>${escapeHtml(names[i])}</th>${row
                .map((v) => `<td>${v === null ? "—" : v.toFixed(2)}</td>`)
                .join("")}</tr>`
          )
          .join("")}</tbody>
      </table></div>`);
  });

  return parts.join("") || "<p>No additional statistics for this task.</p>";
}

// --- helpers ---------------------------------------------------------------

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
