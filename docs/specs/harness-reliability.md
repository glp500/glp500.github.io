# Spec: Mini-Lab harness reliability

Status: implemented; not yet verified in a browser
Date: 2026-07-28

## Assumptions

Stated before anything else, per spec-driven development. Correct any of these and the spec changes.

1. "Not giving reliable output" means the analysis almost always falls back to the deterministic **descriptive summary**, whatever the file and whatever the visitor answered in the guided questions. It does not mean the *numbers* are wrong; those are computed in `analysis.js`, never generated.
2. The machine in question is Firefox on Fedora, so CPU-only decoding at roughly 2 to 5 tok/s for a 0.8B to 2B GGUF. No WebGPU.
3. The default model is Qwen3.5 2B (`_data/minilab-models.yml`), with Qwen3.5 0.8B as the small option.
4. Correctness of the report matters more than latency. A plan that takes 40 seconds and is right beats one that takes 8 seconds and is discarded.

## Objective

A small model, running on a CPU, should produce a **usable plan** most of the time rather than almost never. Success is measured on the fallback rate, not on prose quality.

The model's only job is choosing `task` and `target`. Everything downstream is deterministic.

## Root cause

Constrained decoding is switched off on exactly the machines that need it most.

```
runtime.js:127   constraintAffordable = speed.tokensPerSecond >= 8
                 CPU decode is 2 to 5 tok/s, so this is always false
                     │
runtime.js:129   probeConstraint() only runs when affordable,
                 so constraintWorks stays false as well.
                 The app never learns whether the build supports grammar.
                     │
harness.js:234   schema: supportsConstraint() ? schema : null
                 The schema is therefore never sent.
                     │
                 A 0.8B model asked for
                 {"task":...,"target":...,"rationale":...} with no grammar
                 answers in prose or markdown often enough that
                 extractJSON plus one repair turn cannot cover it.
                     │
analysis.js:104  validatePlan(null, schema, constraints)
                 returns the deterministic summary. Every time.
```

**The threshold rests on a measurement taken from a broken machine.** The comment
justifying it cites 0.15 tok/s constrained against 2.5 unconstrained, roughly 15x.
That figure was written in commit `69b32aa`. The context-contention bug, where two
generations ran on one llama context and produced a 0.61 tok/s reading that
"described the collision rather than the machine", was not fixed until `5dd1c5c`,
two commits later. The number that justifies disabling grammar has never been
re-measured on a machine that was not colliding with itself.

**Official docs confirm the usage is otherwise correct.** From llama.cpp's GBNF
documentation: "The JSON schema is only used to constrain the model output and is
not injected into the prompt. The model has no visibility into the schema, so if
you want it to understand the expected structure, describe it explicitly in your
prompt." `PLAN_SYSTEM` already describes the shape, so grammar and prompt are
complementary rather than redundant. The same page notes `"additionalProperties":
false` "produces faster grammars + reduces hallucinations", and `PLAN_SCHEMA`
already sets it. Only the gate is wrong.
Source: https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md

## Approach

Stop guessing whether grammar is affordable. Measure it, on the machine, at load.
This is the codebase's own stated philosophy (`a8f96c8`, "measure the machine
before trusting it").

1. **Measure the real cost.** The preflight already runs one unconstrained
   generation to get `tokensPerSecond`. Run a second, identical-length generation
   *with* a trivial schema. The ratio is the grammar cost on this machine, not on
   a machine from three commits ago. This replaces both `constraintAffordable`
   and `probeConstraint`, because a constrained probe that returns valid JSON
   proves support and cost in one shot.

2. **Decide from the measurement.** Use grammar when the constrained rate can
   still finish a plan inside the harness budget. A plan is about 40 tokens, so
   the test is whether `40 / constrainedRate` fits comfortably in
   `firstAttemptMs`. On a machine where grammar really is 15x, it will not, and
   the app degrades as it does today. On a machine where it is 1.5x, grammar is
   used and the fallback rate collapses.

3. **Degrade to something better than nothing.** When grammar is genuinely
   unaffordable, do not simply drop the schema. Use the harness's existing repair
   loop harder: allow a third attempt, and make the first repair prompt show the
   exact object shape rather than describing it.

## Non-goals

- Changing which numbers are computed, or letting the model near them.
- Making the model write prose. It picks `task` and `target`; that is all.
- Rewriting the harness. Its bounds, deadlines and early-bail logic are sound and
  stay as they are.

## Commands

```
Test:   node --test "test/*.test.js"
Build:  bundle exec jekyll build
Serve:  bundle exec jekyll serve
Browser: requires chrome-devtools MCP; not configured in this repo yet
```

## Files

```
assets/js/minilab/runtime.js    preflight, constraint decision   (primary)
assets/js/minilab/harness.js    attempt count, repair prompt
assets/js/minilab/analysis.js   plan schema and prompt           (unchanged)
test/runtime.test.js            new: the constraint decision
test/harness.test.js            new: repair loop against fake streams
```

## Testing strategy

`node --test`, no framework, matching the three suites already in `test/`. The
`streamFn` seam in `harness.js:71` and `chatStream`'s `streamFn` parameter let
both new suites run without downloading a model.

Cases that must hold:

- A machine measured fast with grammar uses grammar.
- A machine measured slow with grammar does not, and gets the extra repair attempt.
- A stream emitting prose then JSON still parses.
- A stream emitting only prose, twice, ends in the deterministic fallback and says so.

## Boundaries

- **Always:** run the tests and the Jekyll build before reporting done. Keep every
  number computed rather than generated.
- **Ask first:** changing the default model, adding a dependency, changing what the
  visitor is shown about privacy.
- **Never:** execute model-generated code, send the visitor's data anywhere, or
  silently present a fallback as though the model chose it.

## Success criteria

1. On a CPU-only machine with the default model, a plain CSV produces a plan the
   model chose, not the fallback, on most runs.
2. The diagnostics panel states which of grammar or prompt-only was used, and the
   measured cost that decided it.
3. When the fallback does run, the UI says so plainly and gives the reason.
4. `node --test "test/*.test.js"` passes, including the two new suites.
5. `bundle exec jekyll build` is clean.

## What shipped

All three parts of the approach. `probeConstraint()` became `measureConstraint()`,
which settles support and cost in one generation and returns the numbers behind
the verdict. `supportsConstraint()` now reads that verdict rather than a
threshold. The harness takes a third attempt when the grammar is off, and its
first repair turn shows the literal object shape via `skeleton()`. The hardware
panel gained an "Output" row stating which path is in use and the rate that
decided it.

## Open questions

1. **Unverifiable without a browser.** I cannot measure the real grammar cost on
   your machine this session; chrome-devtools MCP is not configured. The change
   makes the *app* measure it and report the number in diagnostics, so the first
   run after this lands will answer the question. Until then, whether grammar
   becomes affordable on your hardware is a prediction, not a result.
2. Should the third attempt be allowed on every machine, or only when grammar is
   off? Currently specified as: only when grammar is off.
