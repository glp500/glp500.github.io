---
title: "PDF-to-Relational-Data Tool"
summary: "A schema-constrained extraction application that turns documents into validated JSON and related CSV tables for computational research."
date: 2025-07-14
status: "Research prototype"
role: "Data Science Research Assistant · Network Institute"
context: "Research"
dates_display: "2024 — 2025"
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
At the Network Institute, this project supported researchers who needed to move from document collections to structured datasets suitable for quantitative, historical, and network-oriented analysis.

## Question

How can generative extraction produce data that is convenient to use without hiding schema errors, missing relationships, or invalid output?

## Approach

The Streamlit application sends document content through a schema-constrained extraction process, validates the structured response, and separates it into related tables. The interface makes the transformation inspectable before the data enters downstream analysis.

## Current state

This is a research prototype. It demonstrates the extraction and relational-mapping workflow but is not presented as a general-purpose document understanding service.
