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
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: chart
    src: /assets/images/projects/eeg-developmental-deviation.svg
    alt: "Aggregate study summary showing held-out age prediction R squared near 0.62 and no significant symptom association after correction"
    caption: "De-identified aggregate result summary from the approved private study. Strong developmental signal did not translate into a supported symptom-deviation relationship."
    source_url: ""
---
A representation can track neurodevelopmental age very well and still tell you nothing clinical. I wanted to find out whether this one does, once age and sex are handled out of sample rather than regressed away in place.

## Question

Does deviation from age-expected source-space EEG structure align with transdiagnostic symptom dimensions?

## Approach

I aggregate source-space EEG biomarkers into network-by-band features and build the clinical dimensions separately, so neither is fitted to the other. The EEG-to-age model is scored on held-out participants, the developmental-deviation scores are cross-fitted, and only then do I test symptom associations, with correction for multiple testing.

## Results

In the approved aggregate analysis, EEG strongly encoded age (held-out R² approximately 0.62; Spearman ρ approximately 0.79). The age-adjusted developmental deviation did not significantly track the clinical symptom dimensions after false-discovery-rate correction. The null is the finding. I have not filed it away as a figure that did not work out.
