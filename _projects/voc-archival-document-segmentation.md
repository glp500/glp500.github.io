---
title: "VOC Archival Document Segmentation"
summary: "A multimodal machine-learning pipeline for detecting document boundaries across sequences of Dutch East India Company archival page scans."
date: 2025-08-24
status: "Completed research prototype"
role: "AI Research Assistant · KNAW"
context: "Research"
dates_display: "2024 to 2025"
featured: true
featured_rank: 5
stack:
  - Multimodal features
  - Sequence modelling
  - XGBoost
  - TensorFlow
  - scikit-learn
topics:
  - Archival AI
  - Document boundaries
  - VOC collections
outcomes:
  - Models page states as NONE, START, MIDDLE, or END
  - Compares five model families with cross-validation
  - Integrates layout, entity, linguistic, and sequence features
image: /assets/images/projects/archival-segmentation.svg
image_alt: "Sequence of synthetic archival pages labelled start, middle, and end using layout, language, and entity signals"
demo_url: ""
repo_url: "https://github.com/glp500/Multi-View-Learning-for-Archival-Document-Segmentation"
paper_url: ""
fields:
  - computational-history
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/archival-segmentation.svg
    alt: "Synthetic document pages transformed into multimodal features and document-boundary predictions"
    caption: "Explanatory diagram using synthetic pages. No restricted archival scan is reproduced."
    source_url: "https://github.com/glp500/Multi-View-Learning-for-Archival-Document-Segmentation"
    source_label: "Public repository"
---
I framed archival segmentation as a page-sequence classification problem. Every scan gets one of four states (NONE, START, MIDDLE or END), and the sequences can then be reassembled into candidate documents.

## Question

Can layout structure, named entities, linguistic annotations, and neighbouring-page changes help recover document boundaries in a heterogeneous historical collection?

## Approach

The public pipeline builds more than sixty engineered signals out of PAGE XML layout data, XMI annotations and the surrounding page sequence, then puts logistic regression, random forest, XGBoost, a neural network and support-vector approaches against each other on them.

## Evidence

The repository has the model notebooks, with confusion matrices, feature analysis and comparison outputs. I have put a pipeline diagram here instead of a performance headline, because the public repository does not settle on one canonical result and I am not going to invent one for a portfolio page.
