---
title: "NER & Layout Feature Pipeline for Archival Documents"
summary: "A data-engineering pipeline that aligns named entities, PAGE XML layouts, and historian-created boundary annotations for downstream document analysis."
date: 2025-08-25
status: "Completed research pipeline"
role: "AI Research Assistant · KNAW"
context: "Research"
dates_display: "2024 — 2025"
featured: false
stack:
  - Named entity recognition
  - PAGE XML
  - XMI
  - Data validation
topics:
  - Archival AI
  - Dataset construction
  - Document structure
outcomes:
  - Aligns entity, layout, and document-boundary sources
  - Produces training and unseen-test datasets
  - Provides notebooks for inspection and correction
image: /assets/images/projects/ner-layout-pipeline.svg
image_alt: "Synthetic archive page with layout regions and named entities aligned into a validated feature table"
demo_url: ""
repo_url: "https://github.com/glp500/NER-Feature-Extraction-for-Downstream-Document-Analysis"
paper_url: ""
fields:
  - computational-history
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/ner-layout-pipeline.svg
    alt: "Synthetic page annotations, named entities, and boundary labels merged into a feature table"
    caption: "Synthetic explanatory diagram. It shows the data relationships without reproducing archival scans or record contents."
    source_url: "https://github.com/glp500/NER-Feature-Extraction-for-Downstream-Document-Analysis"
    source_label: "Public repository"
---
This project creates the data layer used by downstream archival document modelling. It is separate from the segmentation project: its primary output is an aligned, inspectable feature dataset rather than a trained boundary classifier.

## Question

How can heterogeneous annotations and page-layout records be joined without losing their sequence, labels, or provenance?

## Approach

The pipeline merges inventory data, XMI named-entity annotations, PAGE XML structure, and boundary labels. Cleaning stages remove ambiguous duplicate references, enhance boundary annotations, and create separate training and unseen-test materials.

## Outcome

The result is a reusable feature and quality-control workflow for later modelling. Repository notebooks support inspection and correction rather than hiding the dataset-generation process behind a single export.
