---
title: "NER & Layout Feature Pipeline for Archival Documents"
summary: "A data-engineering pipeline that aligns named entities, PAGE XML layouts, and historian-created boundary annotations for downstream document analysis."
date: 2025-08-25
status: "Completed research pipeline"
role: "AI Research Assistant · KNAW"
context: "Research"
dates_display: "2024 to 2025"
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
This is the data layer that the archival document modelling sits on. It is separate work from the segmentation project: what comes out of it is an aligned feature dataset you can look through, not a trained boundary classifier.

## Question

How can heterogeneous annotations and page-layout records be joined without losing their sequence, labels, or provenance?

## Approach

The pipeline merges inventory data, XMI named-entity annotations, PAGE XML structure and the boundary labels. Cleaning removes ambiguous duplicate references and firms up the boundary annotations, then splits training material from an unseen test set.

## Outcome

What is left is a reusable feature and quality-control workflow for the modelling that comes after. I kept the notebooks in the repository so the dataset can be inspected and corrected, instead of the whole generation process disappearing behind one export.
