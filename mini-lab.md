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

    <p class="minilab__lead">A language model runs on your own graphics card, in this tab. Drop in a file and it decides how the data should be analysed. Nothing is uploaded.</p>
    <p class="minilab__links">
      <a class="arrow-link" href="https://reeselevine.github.io/llamas-on-the-web/" target="_blank" rel="noreferrer">How this works ↗</a>
      <a class="arrow-link" href="https://arxiv.org/abs/2605.20706" target="_blank" rel="noreferrer">Paper ↗</a>
      <a class="arrow-link" href="https://github.com/ggml-org/llama.cpp" target="_blank" rel="noreferrer">llama.cpp ↗</a>
    </p>

    <div class="minilab__layout">

      <aside class="minilab__rail">
        <nav class="ml-apps" aria-label="Applications">
          <button type="button" class="is-active" data-panel-button="data">Data &amp; machine learning</button>
          <button type="button" data-panel-button="retrieval">Retrieval &amp; knowledge graphs</button>
        </nav>

        <div class="ml-setup">
          <h2>Model</h2>
          <p class="ml-status" data-model-progress>Optional — the analysis runs without one.</p>
          <ul class="ml-models" data-models></ul>
          <div class="ml-actions">
            <button type="button" data-load-model disabled>Checking…</button>
            <button type="button" data-cancel-model hidden>Cancel</button>
          </div>

          <details class="ml-more">
            <summary>Another model</summary>
            <div class="ml-hf">
              <div class="ml-hf__row">
                <input type="search" data-hf-search placeholder="Search Hugging Face" aria-label="Search Hugging Face for GGUF models">
                <button type="button" data-hf-search-go>Search</button>
              </div>
              <div data-hf-results></div>
              <div class="ml-hf__row">
                <input type="text" data-hf-repo placeholder="owner/name" aria-label="Hugging Face repository id">
                <button type="button" data-hf-load>Use</button>
              </div>
              <p data-hf-status></p>
              <p class="ml-caveat">Public GGUF repos under 2&nbsp;GB per file.</p>
            </div>
          </details>
        </div>

        <div class="ml-setup">
          <h2>This machine</h2>
          <div data-hardware><p class="ml-status">Checking…</p></div>
        </div>
      </aside>

      <div class="minilab__pane">

        <div data-panel="data">
          <div class="ml-dropzone" data-dropzone tabindex="0" role="button" aria-label="Choose a data file">
            <strong>Drop a CSV or Excel file</strong>
            <span>read in this tab, never uploaded</span>
          </div>
          <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" data-file-input hidden>
          <p class="ml-status" data-file-status></p>

          <section class="ml-step" data-profile hidden></section>

          <section class="ml-step" data-analysis-step hidden>
            <div class="ml-actions">
              <button type="button" class="button button--dark" data-run-analysis disabled>Analyse</button>
              <span class="ml-status" data-analysis-status></span>
            </div>

            <div data-analysis-output hidden>
              <div data-plan></div>
              <div class="ml-charts" data-charts></div>
              <div data-metrics></div>

              <details class="ml-more ml-code-block">
                <summary>Take the code</summary>
                <div class="ml-actions">
                  <button type="button" data-copy-code>Copy</button>
                </div>
                <pre class="ml-code"><code data-code-output></code></pre>
                <h4>requirements.txt</h4>
                <pre class="ml-code"><code data-requirements></code></pre>
              </details>
            </div>
          </section>
        </div>

        <div data-panel="retrieval" hidden>
          <section class="ml-step is-open">
            <h2>Retrieval &amp; knowledge graphs</h2>
            <p>In development. The same local model pointed at literature and code rather than tables — drop in a paper and build outward from it, over OpenAlex, arXiv, Crossref and GitHub.</p>
            <p class="ml-caveat">Nothing is wired up yet, so no results are shown.</p>
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
