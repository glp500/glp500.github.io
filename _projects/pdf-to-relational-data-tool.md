---
title: "PDF-to-Relational-Data Tool"
summary: "A schema-constrained extraction application that turns documents into validated JSON and related CSV tables for computational research."
date: 2025-07-14
status: "Research prototype"
role: "Data Science Research Assistant · Network Institute"
context: "Research"
dates_display: "2024 to 2025"
featured: true
featured_rank: 4
stack:
  - Python
  - Streamlit
  - Gemini
  - Structured outputs
  - Relational data
topics:
  - Document extraction
  - Computational history
  - Data validation
outcomes:
  - Converts PDF tables into structured JSON and multiple relational CSV files
  - Provides a browser-based workflow for research use
  - Includes tests and formatting checks
image: /assets/images/projects/pdf-relational-data.svg
image_alt: "Workflow converting a PDF through schema-constrained extraction into validated relational tables"
demo_url: ""
repo_url: "https://github.com/glp500/Multi-Shot-Inference-for-NER-and-Relational-Database-Mapping"
paper_url: ""
fields:
  - computational-history
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/pdf-relational-data.svg
    alt: "PDF pages processed into schema-constrained JSON and linked relational CSV tables"
    caption: "Sanitized system diagram derived from the public application structure; it contains no source documents or extracted personal records."
    source_url: "https://github.com/glp500/Multi-Shot-Inference-for-NER-and-Relational-Database-Mapping"
    source_label: "Public repository"
---
I built this at the Network Institute, for researchers sitting on a pile of documents who needed a dataset they could actually query, count and draw a network from.

## Question

How can generative extraction produce data that is convenient to use without hiding schema errors, missing relationships, or invalid output?

## Approach

The Streamlit app pushes document content through schema-constrained extraction, validates whatever comes back, and splits it into related tables. You can see the transformation before the data goes anywhere near an analysis.

## Current state

A research prototype. It shows that the extraction and relational-mapping workflow holds together. Point it at documents unlike the ones it was built for and I would expect it to struggle.
