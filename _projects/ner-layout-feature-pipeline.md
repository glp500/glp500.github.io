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
image: /assets/images/projects/layout-regions-7923-0025.webp
image_alt: "A 1755 VOC manuscript page with the model's detected regions drawn over it in colour"
demo_url: ""
repo_url: "https://github.com/glp500/NER-Feature-Extraction-for-Downstream-Document-Analysis"
paper_url: ""
fields:
  - computational-history
related_publication: ""
visuals:
  - type: image
    src: /assets/images/projects/layout-regions-7923-0025.webp
    alt: "Regions detected on NL-HaNA 1.04.02 inv. 7923 scan 0025, coloured by type"
    caption: "Amboina, 15 May 1755. The model's own region polygons drawn over the scan: paragraph in blue, marginalia in orange, header in purple, page number in yellow. The ragged paragraph outline is the model's actual output, not a cleaned-up version of it."
    source_label: "Nationaal Archief, NL-HaNA 1.04.02 inv. 7923"
  - type: image
    src: /assets/images/projects/layout-scan-7923-0025.webp
    alt: "The same 1755 manuscript page without any overlay"
    caption: "The same page with nothing drawn on it, for comparison. Aged paper, bleed-through from the reverse, and a hand that changes width mid-word are what the layout features have to survive."
    source_label: "Nationaal Archief, NL-HaNA 1.04.02 inv. 7923"
  - type: image
    src: /assets/images/projects/layout-regions-7923-0036.webp
    alt: "A second manuscript page with detected regions, including a catch-word at the foot"
    caption: "Scan 0036 from the same inventory. The catch-word at the foot of the page, in green, is the kind of small structural mark that carries a lot of signal about where a document ends."
    source_label: "Nationaal Archief, NL-HaNA 1.04.02 inv. 7923"
---
This is the data layer that the archival document modelling sits on. It is separate work from the segmentation project: what comes out of it is an aligned feature dataset you can look through, not a trained boundary classifier.

## Question

How can heterogeneous annotations and page-layout records be joined without losing their sequence, labels, or provenance?

## Approach

The pipeline merges inventory data, XMI named-entity annotations, PAGE XML structure and the boundary labels. Cleaning removes ambiguous duplicate references and firms up the boundary annotations, then splits training material from an unseen test set.

## Outcome

What is left is a reusable feature and quality-control workflow for the modelling that comes after. I kept the notebooks in the repository so the dataset can be inspected and corrected, instead of the whole generation process disappearing behind one export.
