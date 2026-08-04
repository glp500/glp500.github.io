---
title: "Document-to-ConceptNet"
summary: "A collaborative knowledge-graph project that extracts research-paper concepts, measures ConceptNet relatedness, and generates linked RDF instances."
date: 2025-04-04
status: "Completed course project"
role: "Collaborative MSc coursework"
context: "Graduate coursework"
dates_display: "2025"
featured: false
stack:
  - ConceptNet
  - RDF
  - Python
  - Knowledge graphs
topics:
  - Knowledge representation
  - Semantic similarity
  - Research documents
outcomes:
  - Extracts structured fields from research papers
  - Scores semantic relatedness using ConceptNet Numberbatch
  - Exports RDF/Turtle individuals
image: /assets/images/projects/conceptnet-subgraph.webp
image_alt: "A layered graph linking four papers to their scenarios and the actors extracted from them"
demo_url: ""
repo_url: "https://github.com/glp500/Document-to-ConceptNet"
paper_url: ""
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/conceptnet-subgraph.webp
    alt: "Four HHAI papers on the left, the scenarios they examine in the middle, and the actors involved on the right"
    caption: "A slice of the graph the pipeline built from the HHAI paper set: paper, then the scenario it examines, then the actors in that scenario. Two papers landing on neighbouring scenarios and sharing actors is the structure worth having; it is what makes the collection queryable rather than just searchable."
    source_label: "final_ontology_extension.ttl"
---
A group project from my MSc. We pulled information out of research papers and turned it into a small semantic representation, wired together through ConceptNet.

## Question

Can commonsense embeddings and explicit RDF relations help connect extracted descriptions of research scenarios, methods, and tasks?

## Approach

The workflow pulls fields out of each paper, scores how related they are using ConceptNet Numberbatch, and writes Turtle instances from the structured output.

## Context

This was coursework, and it was collaborative. I have not carved up who did which part, because I cannot verify that from the repository.
