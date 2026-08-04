---
title: "Early Modern Dutch LLM Fine-Tuning"
summary: "A reproducible language-model training and evaluation framework for translating Early Modern Dutch, developed from a BSc thesis into an open-access publication."
date: 2024-07-01
status: "Published research"
role: "BSc thesis researcher · KNAW AI research intern"
context: "Research"
dates_display: "2023 to 2024, published 2026"
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
image: /assets/images/projects/emdutch-evaluation.webp
image_alt: "Paired bar chart of mean BERTScore and METEOR for ten Early Modern Dutch translation variants"
demo_url: ""
repo_url: "https://github.com/glp500/EMDutch-LLM-Finetune"
paper_url: "https://doi.org/10.1017/chr.2026.10022"
fields:
  - computational-history
related_publication: "fine-tuning-early-modern-dutch"
visuals:
  - type: chart
    src: /assets/images/projects/emdutch-evaluation.webp
    alt: "Horizontal paired bars for ten model variants, with fine-tuned Mistral and Llama 3 at the top"
    caption: "Mean BERTScore and METEOR over the test set, ten variants. Fine-tuned Mistral (0.864 / 0.758) and Llama 3 (0.852 / 0.743) both come out above GPT-4o (0.801 / 0.665). Read as a ranking rather than as absolute quality: both metrics reward surface overlap, which is exactly what fine-tuning on this corpus optimises."
    source_label: "Thesis result data"
---
I started this as a BSc Artificial Intelligence thesis at Vrije Universiteit Amsterdam, during a research internship at the Netherlands Royal Academy of Arts and Sciences. It grew into an open-access paper with Victor de Boer, Arjan Bosse and Daan Grantsaan.

## Question

How can large language models be adapted and evaluated for low-resource historical translation when spelling, grammar, and cultural context differ from contemporary language?

## Approach

I kept training-data preparation, parameter-efficient fine-tuning, inference and evaluation in separate stages, so any one of them can be rerun on its own. Base and adapted variants are compared on automatic semantic and alignment metrics, with domain-expert assessment alongside.

## Results

The figure reproduces the committed aggregate means for BERTScore and METEOR. Several fine-tuned variants score well. Neither the paper nor I would take that as evidence that a model has resolved the interpretive problems of historical translation; the metrics are one input to a wider evaluation, and a historian reading the output remains the harder test.
