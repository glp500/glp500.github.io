---
title: "Gauntlet: a local AI analysis sandbox"
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
fields: []
related_publication: ""
visuals:
  - type: diagram
    src: /assets/images/projects/gauntlet.svg
    alt: "Task and CSV inputs flowing through planning, code generation, sandbox execution, and artifact review"
    caption: "System diagram based on the public prototype: every run has its own generated bundle, execution workspace, logs, and outputs."
    source_url: "https://github.com/glp500/Gauntlet"
    source_label: "Public repository"
---
Gauntlet is a deliberately narrow version of agentic analysis. You supply a task and some local CSV files, it writes a small Python bundle, and the bundle runs in a workspace of its own, so everything it did is still sitting there when you want to check it.

## Question

Can a local AI analysis tool remain useful while making its generated code, execution trace, and outputs visible enough to review?

## Approach

Prompt refinement, bundle generation, sandbox execution and artifact collection are separate stages. Several model backends work, local runtimes included, and none of them get to treat the model's reply as the finished analysis.

## Current state

An experimental Story Machines prototype. It is not a production security boundary and not an autonomous research system, and I would not describe it as either. The public repository holds a workflow snapshot and a sample run structure.
