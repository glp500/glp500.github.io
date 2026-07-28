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
image: /assets/images/projects/document-conceptnet.svg
image_alt: "Research document concepts linked through a small knowledge graph and exported as RDF"
demo_url: ""
repo_url: "https://github.com/glp500/Document-to-ConceptNet"
paper_url: ""
fields:
  - machine-learning
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/document-conceptnet.svg
    alt: "Extracted document concepts connected to ConceptNet relations and serialized into RDF"
    caption: "Explanatory diagram of the public group-project pipeline."
    source_url: "https://github.com/glp500/Document-to-ConceptNet"
    source_label: "Public repository"
---
A group project from my MSc. We pulled information out of research papers and turned it into a small semantic representation, wired together through ConceptNet.

## Question

Can commonsense embeddings and explicit RDF relations help connect extracted descriptions of research scenarios, methods, and tasks?

## Approach

The workflow pulls fields out of each paper, scores how related they are using ConceptNet Numberbatch, and writes Turtle instances from the structured output.

## Context

This was coursework, and it was collaborative. I have not carved up who did which part, because I cannot verify that from the repository.
