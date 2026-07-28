---
title: "Stable Representations Benchmark"
summary: "A leakage-aware benchmark asking whether Leiden feature communities can produce compact, stable, and interpretable supports for transdiagnostic clinical-burden modelling."
date: 2026-06-15
status: "MSc thesis study"
role: "MSc thesis researcher · CNCR AI research intern"
context: "Research"
dates_display: "2026"
featured: false
stack:
  - Leiden communities
  - Nested cross-validation
  - Feature selection
  - Stability analysis
topics:
  - EEG and phenotype data
  - Stable representations
  - Clinical burden
outcomes:
  - Fits preprocessing and graph construction within training folds
  - Compares structural and predictive representatives
  - Reports stability, coverage, and predictive evidence separately
image: /assets/images/projects/stable-representations.svg
image_alt: "Mixed-association feature graph divided into Leiden communities and compact selected supports"
demo_url: ""
repo_url: ""
paper_url: ""
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/stable-representations.svg
    alt: "Feature association graph partitioned into communities before fold-specific representation selection"
    caption: "De-identified methods diagram based on the approved private benchmark; no participant records or private paths are shown."
    source_url: ""
---
I treat feature selection here as a question about representation stability, not as a hunt for the highest classification score.

## Question

Can fixed Leiden feature communities support raw-feature selections that stay small and stable across resampling, and still mean something to a reader?

## Approach

Mixed-type associations are estimated inside the training data, features are partitioned into communities, and representatives are selected under nested validation. Stability, modality coverage, and predictive performance are reported as distinct criteria.

## Evidence policy

I can describe the validated methodology and what the study was for. The code, the participant-level data and the internal paths stay private.
