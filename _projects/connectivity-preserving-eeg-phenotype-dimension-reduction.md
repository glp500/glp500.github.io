---
title: "Connectivity-Preserving EEG–Phenotype Dimension Reduction"
summary: "A benchmark testing which dimensionality-reduction methods preserve interpretable transdiagnostic relationships between EEG modes and symptom dimensions."
date: 2026-07-10
status: "MSc thesis study"
role: "MSc thesis researcher · CNCR AI research intern"
context: "Research"
dates_display: "2026"
featured: false
stack:
  - Sparse PLS
  - Canonical PLS
  - Group factor analysis
  - Bipartite graphs
  - Nested validation
topics:
  - EEG–phenotype mapping
  - Connectivity preservation
  - Transdiagnostic modelling
outcomes:
  - Compares shared, sparse, deep, and single-view reductions
  - Builds post-reduction bipartite graphs as an evaluation instrument
  - Validates latent modes before graph construction
image: /assets/images/projects/eeg-connectivity-preservation.svg
image_alt: "EEG latent modes connected to symptom dimensions in a validated bipartite graph"
demo_url: ""
repo_url: ""
paper_url: ""
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: chart
    src: /assets/images/projects/eeg-connectivity-preservation.svg
    alt: "Aggregate comparison showing cross-view methods preserving more EEG–phenotype connectivity than single-view baselines"
    caption: "De-identified aggregate result summary. Communities are interpreted as exploratory graph modules, not biomarkers or neural circuits."
    source_url: ""
---
Many reduction methods are optimized for reconstruction or prediction. This study instead asks whether a compressed representation preserves cross-modal structure that can still be inspected after reduction.

## Question

Which reduction methods retain interpretable relationships between EEG modes and shared transdiagnostic symptom dimensions?

## Approach

Sparse and canonical PLS, group factor analysis, a deep shared model, and single-view baselines are evaluated within a common validation framework. Bipartite community detection is used as a measurement layer after latent modes pass nested validation, permutation, and stability checks.

## Results

In the approved aggregate analysis, joint cross-modal methods preserved more symptom-linked structure than single-view PCA/ICA baselines. Canonical PLS recovered symptom dimensions strongly in-sample (canonical correlation approximately 0.83), while sparse PLS led the aggregate preservation score. These exploratory graph modules are not presented as biomarkers, circuits, or treatment targets.
