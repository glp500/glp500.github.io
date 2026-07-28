// Two invariants that cost a debugging session each.
//
// 1. Backend selection. web-llm is WebGPU-only; picking it on a machine without
//    a GPU means nothing runs at all.
// 2. Single-flight. Both backends hold one context, so two overlapping
//    generations corrupt each other's decoding — that was the 23s first token
//    and the 0.61 tok/s reading that described a collision, not the machine.
//
// Run: node --test "test/*.test.js"

import test from "node:test";
import assert from "node:assert/strict";
import { chatStream, backendFor } from "../assets/js/minilab/runtime.js";

const GGUF = { id: "qwen3.5-2b", repo: "org/repo", file: "model.gguf" };
const MLC = { id: "Llama-3.2-1B-Instruct-q4f32_1-MLC", backend: "webllm" };
const CPU = { webgpu: false, gpuName: "", threads: 4, crossOriginIsolated: true };
const GPU = { webgpu: true, gpuName: "Radeon", threads: 8, crossOriginIsolated: true };

test("wllama is the only backend without a GPU", () => {
  assert.equal(backendFor(GGUF, CPU), "wllama");
  // An MLC model on a CPU-only machine must not select web-llm: it cannot run.
  assert.equal(backendFor(MLC, CPU), "wllama");
});

test("web-llm is chosen only for MLC models on a GPU", () => {
  assert.equal(backendFor(MLC, GPU), "webllm");
  // GGUF weights are not MLC-compiled, so a GPU does not make them web-llm's.
  assert.equal(backendFor(GGUF, GPU), "wllama");
});

test("concurrent generations queue instead of overlapping", async () => {
  const log = [];

  const fake = (tag) =>
    async function* () {
      log.push(`${tag}:enter`);
      for (const piece of ["a", "b", "c"]) {
        await new Promise((r) => setTimeout(r, 5));
        yield piece;
      }
      log.push(`${tag}:exit`);
    };

  const drain = async (tag) => {
    let text = "";
    for await (const piece of chatStream({ messages: [], streamFn: fake(tag) })) text += piece;
    return text;
  };

  const [first, second] = await Promise.all([drain("one"), drain("two")]);

  assert.equal(first, "abc");
  assert.equal(second, "abc");
  // Interleaved would read one:enter, two:enter, one:exit, two:exit.
  assert.deepEqual(log, ["one:enter", "one:exit", "two:enter", "two:exit"]);
});

test("a queued generation still runs after the one ahead of it throws", async () => {
  const boom = async function* () {
    throw new Error("decode failed");
  };
  const fine = async function* () {
    yield "ok";
  };

  const failed = chatStream({ messages: [], streamFn: boom });
  const queued = chatStream({ messages: [], streamFn: fine });

  await assert.rejects(async () => {
    for await (const _ of failed) void _;
  });

  let text = "";
  for await (const piece of queued) text += piece;
  assert.equal(text, "ok", "the queue was left locked by the failure ahead of it");
});
