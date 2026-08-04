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
image: /assets/images/projects/segmentation-model-heatmap.webp
image_alt: "Heatmap comparing accuracy, precision, recall and per-class F1 across five segmentation models"
demo_url: ""
repo_url: "https://github.com/glp500/Multi-View-Learning-for-Archival-Document-Segmentation"
paper_url: ""
fields:
  - computational-history
related_publication: ""
visuals:
  - type: chart
    src: /assets/images/projects/segmentation-model-heatmap.webp
    alt: "Heatmap of accuracy, precision, recall and per-class F1 for logistic regression, random forest, XGBoost, a neural network and an SVM"
    caption: "Five models on the same held-out inventory. XGBoost leads on almost every measure, but the gap to logistic regression is small enough that the cheaper model stayed in the comparison."
    source_label: "Repository output"
  - type: chart
    src: /assets/images/projects/segmentation-classwise.webp
    alt: "Class-wise precision, recall and F1 for the NONE, START, MIDDLE and END boundary classes"
    caption: "Broken out by class, the difficulty is obvious: MIDDLE is 77 percent of the pages and is easy, while START and END are each about 9 percent and are where the useful errors live."
    source_label: "Repository output"
  - type: chart
    src: /assets/images/projects/segmentation-rf-importance.webp
    alt: "Random forest top-15 feature importances, led by layout consistency with neighbouring pages"
    caption: "What the random forest actually leans on. Consistency of layout with the neighbouring pages outranks anything measured on the page in isolation, which is the whole argument for treating this as a sequence problem."
    source_label: "Repository output"
---
I framed archival segmentation as a page-sequence classification problem. Every scan gets one of four states (NONE, START, MIDDLE or END), and the sequences can then be reassembled into candidate documents.

## Question

Can layout structure, named entities, linguistic annotations, and neighbouring-page changes help recover document boundaries in a heterogeneous historical collection?

## Approach

The public pipeline builds more than sixty engineered signals out of PAGE XML layout data, XMI annotations and the surrounding page sequence, then puts logistic regression, random forest, XGBoost, a neural network and support-vector approaches against each other on them.

## Evidence

The repository has the model notebooks, with confusion matrices, feature analysis and comparison outputs. I have put a pipeline diagram here instead of a performance headline, because the public repository does not settle on one canonical result and I am not going to invent one for a portfolio page.
