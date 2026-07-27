---
title: "Early Modern Dutch LLM Fine-Tuning"
summary: "A reproducible language-model training and evaluation framework for translating Early Modern Dutch, developed from a BSc thesis into an open-access publication."
date: 2024-07-01
status: "Published research"
role: "BSc thesis researcher · KNAW AI research intern"
context: "Research"
dates_display: "2023 — 2024 · published 2026"
featured: true
featured_rank: 3
stack:
  - Llama 3
  - ORPO
  - LoRA
  - BERTScore
  - METEOR
topics:
  - Historical language
  - Computational humanities
  - Model evaluation
outcomes:
  - Reproducible fine-tuning, inference, and evaluation notebooks
  - Open-access article in Computational Humanities Research
  - Nomination for the 2024 Amsterdam AI Thesis Awards
image: /assets/images/projects/emdutch-evaluation.svg
image_alt: "Paired bar chart comparing mean BERTScore and METEOR results across Early Modern Dutch translation models"
demo_url: ""
repo_url: "https://github.com/glp500/EMDutch-LLM-Finetune"
paper_url: "https://doi.org/10.1017/chr.2026.10022"
fields:
  - computational-history
related_publication: "fine-tuning-early-modern-dutch"
visuals:
  - type: chart
    src: /assets/images/projects/emdutch-evaluation.svg
    alt: "Mean BERTScore and METEOR values for ten evaluated translation model variants"
    caption: "Mean automatic evaluation scores from the repository’s aggregate result tables. These metrics are complementary signals, not complete measures of historical translation quality."
    source_url: "https://github.com/glp500/EMDutch-LLM-Finetune/tree/main/Findings%3AResults%20from%20paper/BERT%3AMETEOR%20Scores"
    source_label: "Aggregate score tables"
---
This project began as a BSc Artificial Intelligence thesis at Vrije Universiteit Amsterdam and research internship at the Netherlands Royal Academy of Arts and Sciences. It later developed into an open-access paper with Victor de Boer, Arjan Bosse, and Daan Grantsaan.

## Question

How can large language models be adapted and evaluated for low-resource historical translation when spelling, grammar, and cultural context differ from contemporary language?

## Approach

The repository separates training-data preparation, parameter-efficient fine-tuning, model inference, and evaluation. It compares base and adapted model variants using automatic semantic and alignment metrics alongside domain-expert assessment.

## Results

The figure reproduces the committed aggregate means for BERTScore and METEOR. Several fine-tuned variants score strongly on the automatic metrics, but the publication treats those scores as one part of a wider evaluation rather than evidence that a model has resolved the interpretive challenges of historical translation.
