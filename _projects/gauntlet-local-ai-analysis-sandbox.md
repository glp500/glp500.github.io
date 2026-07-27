---
title: "Gauntlet — Local AI Analysis Sandbox"
summary: "An experimental Story Machines prototype that turns a task and local tabular inputs into an inspectable Python analysis bundle."
date: 2026-04-29
status: "Experimental prototype"
role: "Co-founder · prototype development"
context: "Startup"
dates_display: "April 2026"
featured: true
featured_rank: 2
stack:
  - Python
  - Local language models
  - Sandboxed execution
  - Artifact provenance
topics:
  - Local AI
  - Analysis tools
  - Inspectability
outcomes:
  - Generates a small Python bundle from a task and CSV inputs
  - Executes each run in a separate workspace
  - Preserves prompts, logs, code, and outputs for inspection
image: /assets/images/projects/gauntlet.svg
image_alt: "Gauntlet workflow from local task and data through generated code, sandbox execution, and inspected artifacts"
demo_url: ""
repo_url: "https://github.com/glp500/Gauntlet"
paper_url: ""
research_programs: []
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/gauntlet.svg
    alt: "Task and CSV inputs flowing through planning, code generation, sandbox execution, and artifact review"
    caption: "System diagram based on the public prototype: every run has its own generated bundle, execution workspace, logs, and outputs."
    source_url: "https://github.com/glp500/Gauntlet"
    source_label: "Public repository"
---
Gauntlet explores a narrow version of agentic analysis: a person supplies a task and local CSV files, the system generates a small Python bundle, and that bundle runs inside a per-run workspace whose artifacts can be inspected afterward.

## Question

Can a local AI analysis tool remain useful while making its generated code, execution trace, and outputs visible enough to review?

## Approach

The prototype separates prompt refinement, bundle generation, sandbox execution, and artifact collection. It supports several model backends—including local runtimes—without treating the model response itself as the final analytical product.

## Current state

Gauntlet is an experimental Story Machines prototype, not a production security boundary or an autonomous research system. The public repository records a workflow snapshot and sample run structure.
