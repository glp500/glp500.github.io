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
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/latent-structure.svg
    alt: "EEG and phenotype views mapped into shared representations and evaluated across resampled folds"
    caption: "De-identified benchmark diagram. It communicates the comparison contract without publishing private code or participant data."
    source_url: ""
---
If a method explicitly optimizes shared cross-view structure, does the representation it produces survive resampling any better than one built for explained variance alone? That is the whole question here.

## Question

Which latent representations are stable, sample-efficient, and useful for downstream analysis across heterogeneous EEG and phenotype views?

## Approach

Fold-safe data preparation, benchmark execution, aggregate evaluation and visualization are kept apart. Linear and nonlinear methods run under the same split discipline and report against the same contract, which is the only way the numbers can be set beside each other.

## Current state

What I can show publicly is the benchmark architecture and the research claim. I am not going to name a winning method, because the study underneath has not established one.
