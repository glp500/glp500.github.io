---
title: "Age-Aware EEG Developmental Deviation"
summary: "An MSc study testing whether age-adjusted source-space EEG deviations align with dimensional symptom structure."
date: 2026-07-01
status: "MSc thesis study"
role: "MSc thesis researcher · CNCR AI research intern"
context: "Research"
dates_display: "2026"
featured: true
featured_rank: 6
stack:
  - Source-space EEG
  - Cross-fitting
  - PCA
  - Leiden communities
  - Permutation testing
topics:
  - Neuroinformatics
  - Developmental modelling
  - Transdiagnostic symptoms
outcomes:
  - End-to-end analysis on an aggregate 1,318-participant research cohort
  - Strong held-out developmental-age signal in EEG
  - No significant symptom association after false-discovery-rate correction
image: /assets/images/projects/eeg-developmental-deviation.svg
image_alt: "Diagram contrasting strong EEG age prediction with a null age-adjusted symptom association"
demo_url: ""
repo_url: ""
paper_url: ""
research_programs:
  - multiview-neuroinformatics
  - machine-learning-artificial-worlds
related_publication: ""
visuals:
  - type: chart
    src: /assets/images/projects/eeg-developmental-deviation.svg
    alt: "Aggregate study summary showing held-out age prediction R squared near 0.62 and no significant symptom association after correction"
    caption: "De-identified aggregate result summary from the approved private study. Strong developmental signal did not translate into a supported symptom-deviation relationship."
    source_url: ""
---
This study asks whether a representation that clearly tracks neurodevelopmental age also captures dimensional clinical variation once age and sex are handled out of sample.

## Question

Does deviation from age-expected source-space EEG structure align with transdiagnostic symptom dimensions?

## Approach

Source-space EEG biomarkers are aggregated into network-by-band features. Clinical dimensions are constructed separately, an EEG-to-age model is evaluated on held-out participants, and developmental-deviation scores are cross-fitted before testing symptom associations with multiple-testing correction.

## Results

In the approved aggregate analysis, EEG strongly encoded age (held-out R² approximately 0.62; Spearman ρ approximately 0.79). The age-adjusted developmental deviation did not significantly track the clinical symptom dimensions after false-discovery-rate correction. That null result is central to the study rather than treated as a failed visualization.
