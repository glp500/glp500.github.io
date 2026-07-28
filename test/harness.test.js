// The harness is what stands between a small model and an unusable report.
//
// These run against fake token streams through the `streamFn` seam, so no
// weights are downloaded and a "slow machine" is just a timer.
// Run: node --test "test/*.test.js"

import test from "node:test";
import assert from "node:assert/strict";
import { runGuarded, extractJSON, skeleton } from "../assets/js/minilab/harness.js";
import { measureConstraint, PLAN_TOKENS } from "../assets/js/minilab/runtime.js";

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    task: { type: "string", enum: ["summary", "correlation", "classification", "regression"] },
    target: { type: ["string", "null"] },
    rationale: { type: "string", maxLength: 140 },
  },
  required: ["task"],
  additionalProperties: false,
};

/** Emits `text` one character at a time, so token counting is deterministic. */
const emit = (text) =>
  async function* () {
    for (const ch of text) yield ch;
  };

const validPlan = '{"task":"correlation","target":null,"rationale":"two numeric columns"}';

test("a clean JSON reply is accepted on the first attempt", async () => {
  const result = await runGuarded({
    messages: [],
    schema: PLAN_SCHEMA,
    streamFn: emit(validPlan),
    validate: (p) => ({ ok: p.task === "correlation", value: p, error: "wrong task" }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.task, "correlation");
  assert.equal(result.attempts.length, 1);
});

test("prose wrapped around the JSON still parses", async () => {
  const messy = "Sure! Here is the plan:\n```json\n" + validPlan + "\n```\nHope that helps.";
  const result = await runGuarded({ messages: [], schema: PLAN_SCHEMA, streamFn: emit(messy) });
  assert.equal(result.ok, true);
  assert.equal(result.value.task, "correlation");
});

test("pure prose exhausts the attempts and reports why", async () => {
  let calls = 0;
  const alwaysProse = () => {
    calls += 1;
    return emit("I would suggest looking at the correlation between the columns.")();
  };
  const result = await runGuarded({ messages: [], schema: PLAN_SCHEMA, streamFn: alwaysProse });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "unparseable");
  // Three turns without a grammar: the model gets two chances to be corrected.
  assert.equal(calls, 3, "unconstrained runs should get a third attempt");
  assert.equal(result.attempts.length, 3);
});

test("a repair turn is given the literal shape, not a description of it", () => {
  const shape = skeleton(PLAN_SCHEMA);
  assert.match(shape, /"task":"summary\|correlation\|classification\|regression"/);
  assert.match(shape, /"target":null/);
  assert.ok(shape.startsWith("{") && shape.endsWith("}"));
});

test("a semantically wrong plan is repaired, not accepted", async () => {
  const replies = ['{"task":"regression","target":"nope"}', validPlan];
  let i = 0;
  const result = await runGuarded({
    messages: [],
    schema: PLAN_SCHEMA,
    streamFn: () => emit(replies[i++])(),
    validate: (p) =>
      p.target === "nope"
        ? { ok: false, error: 'Column "nope" does not exist in this file.' }
        : { ok: true, value: p },
  });
  assert.equal(result.ok, true);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].outcome, "invalid");
});

test("extractJSON takes the first balanced object and ignores trailing noise", () => {
  assert.deepEqual(extractJSON('{"a":1} then some rambling'), { a: 1 });
  assert.deepEqual(extractJSON('text {"a":{"b":2}} more'), { a: { b: 2 } });
  assert.equal(extractJSON("no object here"), null);
  assert.equal(extractJSON('{"unterminated": '), null);
});

// --- the grammar decision --------------------------------------------------

test("a fast constrained stream turns the grammar on", async () => {
  const c = await measureConstraint(
    { ok: true, tokensPerSecond: 4 },
    { streamFn: emit('{"ok":true}') }
  );
  assert.equal(c.supported, true);
  assert.equal(c.used, true, "a stream this fast should be able to afford a grammar");
  assert.match(c.why, /decodes in about/);
});

test("a build that ignores the schema is reported as unsupported", async () => {
  const c = await measureConstraint(
    { ok: true, tokensPerSecond: 4 },
    { streamFn: emit("Certainly, the answer is true.") }
  );
  assert.equal(c.supported, false);
  assert.equal(c.used, false);
  assert.match(c.why, /did not bind the schema/);
});

test("the decision is a rate, not a hardcoded threshold", async () => {
  // One token per second: a 40-token plan would take 40s, inside the ceiling.
  const slow = async function* () {
    for (const ch of '{"ok":true}') {
      await new Promise((r) => setTimeout(r, 12));
      yield ch;
    }
  };
  const c = await measureConstraint({ ok: true, tokensPerSecond: 2 }, { streamFn: slow });
  assert.equal(c.supported, true);
  assert.ok(c.grammarTps > 0, "the constrained rate must be measured, not assumed");
  // The ratio is reported for the diagnostics panel; on a fake stream it can
  // land either side of 1, so only its presence is asserted here.
  assert.ok(c.ratio === null || Number.isFinite(c.ratio));
  // Whatever the verdict, it has to be justified by that measurement.
  assert.match(c.why, new RegExp(`${PLAN_TOKENS}-token plan`));
});
