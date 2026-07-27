---
title: "Latent Structure Benchmark"
summary: "A modular benchmark comparing whether cross-view representation methods recover structures that are stable under resampling and useful downstream."
date: 2026-06-20
status: "MSc thesis study"
role: "MSc thesis researcher · CNCR AI research intern"
context: "Research"
dates_display: "2026"
featured: false
stack:
  - Multiview learning
  - Nested cross-validation
  - Deep CCA
  - Robustness studies
topics:
  - Latent representations
  - Cross-view structure
  - Reproducibility
outcomes:
  - Modular data, benchmark, evaluation, and visualization interfaces
  - Repeated validation and perturbation summaries
  - Euclidean and graph-based representation views
image: /assets/images/projects/latent-structure.svg
image_alt: "Two heterogeneous data views projected into a shared latent space and evaluated for stability"
demo_url: ""
repo_url: ""
paper_url: ""
research_programs:
  - multiview-neuroinformatics
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/latent-structure.svg
    alt: "EEG and phenotype views mapped into shared representations and evaluated across resampled folds"
    caption: "De-identified benchmark diagram. It communicates the comparison contract without publishing private code or participant data."
    source_url: ""
---
This benchmark asks whether methods that explicitly optimize shared cross-view structure produce representations that survive resampling better than methods focused on explained variance alone.

## Question

Which latent representations are stable, sample-efficient, and useful for downstream analysis across heterogeneous EEG and phenotype views?

## Approach

The study separates fold-safe data preparation, benchmark execution, aggregate evaluation, and visualization. Linear and optional nonlinear methods share the same split discipline and reporting contract.

## Current state

The approved summary covers the benchmark architecture and research claim. It does not present a universal winning method where the underlying study has not established one.
