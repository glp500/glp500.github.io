---
title: Mini-Lab
layout: default
permalink: /mini-lab/
nav_key: mini-lab
world_mode: research
description: Small language models running locally in your browser over WebGPU, applied to data that never leaves your machine.
---
{% include page-hero.html mode="research" %}

<section class="minilab" data-world-mode="research">
  <div class="shell">

    <div class="minilab__intro">
      <p class="minilab__lead">A small language model runs on your own graphics card, in this tab. You drop in a file, the model decides how it should be analysed, and the analysis runs here. Nothing is uploaded, and there is no server.</p>
      <p>The model chooses <em>which</em> analysis fits your data and writes the commentary. It never produces the numbers — every figure comes from code executed against your file, so the model can be wrong about what to look at without being wrong about what is there.</p>
      <p class="minilab__links">
        <a class="arrow-link" href="https://reeselevine.github.io/llamas-on-the-web/" target="_blank" rel="noreferrer">How WebGPU inference works ↗</a>
        <a class="arrow-link" href="https://arxiv.org/abs/2605.20706" target="_blank" rel="noreferrer">The paper ↗</a>
        <a class="arrow-link" href="https://github.com/ggml-org/llama.cpp" target="_blank" rel="noreferrer">llama.cpp ↗</a>
      </p>
    </div>

    <div class="minilab__layout">
      <nav class="minilab__rail" aria-label="Applications">
        <button type="button" class="is-active" data-panel-button="data">
          <strong>Data &amp; Machine Learning</strong>
          <span>Profile a table, choose an analysis, get the code</span>
        </button>
        <button type="button" data-panel-button="retrieval">
          <strong>Retrieval &amp; Knowledge Graphs</strong>
          <span>Papers, repositories, reading paths</span>
        </button>
        <div class="minilab__hardware">
          <h2>Your hardware</h2>
          <div data-hardware><p>Checking…</p></div>
        </div>
      </nav>

      <div class="minilab__pane">

        <section class="minilab__block" aria-labelledby="ml-model-title">
          <h2 id="ml-model-title">Model</h2>
          <ul class="ml-models" data-models></ul>

          <div class="ml-actions">
            <button type="button" class="button button--dark" data-load-model disabled>Checking hardware…</button>
            <button type="button" data-cancel-model hidden>Cancel</button>
          </div>
          <p class="ml-progress" data-model-progress>No model loaded. The analysis still runs without one, using a default plan.</p>

          <details class="ml-more">
            <summary>Use a different model from Hugging Face</summary>
            <div class="ml-hf">
              <div class="ml-hf__row">
                <input type="search" data-hf-search placeholder="Search GGUF models, e.g. qwen3.5" aria-label="Search Hugging Face">
                <button type="button" data-hf-search-go>Search</button>
              </div>
              <div data-hf-results></div>
              <div class="ml-hf__row">
                <input type="text" data-hf-repo placeholder="Or paste a repo id, e.g. unsloth/Qwen3.5-2B-GGUF" aria-label="Hugging Face repository id">
                <button type="button" data-hf-load>Use</button>
              </div>
              <p data-hf-status></p>
              <p class="ml-caveat">Only public repositories with single-file GGUF weights under 2&nbsp;GB can load in a browser.</p>
            </div>
          </details>
        </section>

        <div data-panel="data">
          <section class="minilab__block" aria-labelledby="ml-data-title">
            <h2 id="ml-data-title">Your data</h2>
            <div class="ml-dropzone" data-dropzone tabindex="0" role="button" aria-label="Choose a data file">
              <strong>Drop a CSV, TSV or Excel file here</strong>
              <span>or press to choose one — it is read in this tab and never uploaded</span>
            </div>
            <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" data-file-input hidden>
            <p class="ml-progress" data-file-status></p>
            <div class="ml-profile" data-profile hidden></div>
          </section>

          <section class="minilab__block" aria-labelledby="ml-analysis-title">
            <h2 id="ml-analysis-title">Analysis</h2>
            <button type="button" class="button button--dark" data-run-analysis disabled>Run analysis</button>
            <p class="ml-progress" data-analysis-status></p>

            <div data-analysis-output hidden>
              <div data-plan></div>
              <div class="ml-charts" data-charts></div>
              <div data-metrics></div>

              <h3>Run it yourself</h3>
              <p>The same analysis as a standalone script. It reads your file from disk and reproduces every figure above.</p>
              <div class="ml-actions">
                <button type="button" data-copy-code>Copy the code</button>
              </div>
              <pre class="ml-code"><code data-code-output></code></pre>
              <h4>requirements.txt</h4>
              <pre class="ml-code"><code data-requirements></code></pre>
            </div>
          </section>
        </div>

        <div data-panel="retrieval" hidden>
          <section class="minilab__block">
            <h2>Retrieval &amp; Knowledge Graphs</h2>
            <p>In development. The intent is to point the same local model at literature and code rather than at tables: drop in a paper or a link, and build outward from it.</p>
            <ul class="ml-list">
              <li><strong>Sources.</strong> OpenAlex, arXiv, Crossref and the GitHub API — all public and key-free, queried from your browser.</li>
              <li><strong>Reading paths.</strong> Follow citations outward from a paper you already have, with the model summarising why each hop matters.</li>
              <li><strong>Your own documents.</strong> Drop in a PDF or a link and find where it connects to work you have already collected.</li>
            </ul>
            <p class="ml-caveat">Nothing here is wired up yet, and no results are shown, because inventing them would defeat the point of the page.</p>
          </section>
        </div>

      </div>
    </div>
  </div>
</section>

<script type="application/json" id="minilab-models">{{ site.data['minilab-models'] | jsonify }}</script>
<script type="module">
  import("{{ '/assets/js/minilab/app.js' | relative_url }}")
    .then((mod) => mod.init(document.querySelector(".minilab")))
    .catch((error) => {
      const target = document.querySelector("[data-hardware]");
      if (target) target.innerHTML = "<p>The Mini-Lab could not start in this browser.</p>";
      console.error(error);
    });
</script>
