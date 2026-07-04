import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function compile(file, url) {
  return ts.transpileModule(readFileSync(new URL(file, url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const buildDir = await mkdtemp(path.join(tmpdir(), "dialect-streaming-"));

function* bytes(chunks) {
  const encoder = new TextEncoder();
  for (const chunk of chunks) {
    yield encoder.encode(chunk);
  }
}

try {
  // The facade imports client-contract only for types, which erase at compile
  // time, so the transpiled JS is standalone.
  writeFileSync(
    path.join(buildDir, "dialect-streaming-facade.js"),
    compile("./dialect-streaming-facade.ts", import.meta.url),
    "utf8"
  );
  const mod = await import(
    pathToFileURL(path.join(buildDir, "dialect-streaming-facade.js")).href
  );

  const glmDialect = {
    baseUrl: "https://api.z.ai",
    providerId: "glm",
    thinkingForm: "reasoning_content",
    toolChoiceSupport: "auto_only",
    usageFromAnyChunk: false,
  };

  // readSseDataFrames splits data: frames across chunk boundaries.
  const frames = [];
  for await (const frame of mod.readSseDataFrames(
    bytes(['data: {"a":1}\n\ndata: {"b', '":2}\n\n'])
  )) {
    frames.push(frame);
  }
  assert.deepEqual(frames, ['{"a":1}', '{"b":2}']);

  // GLM reasoning_content maps onto the thinking channel; [DONE] is null.
  const glmChunk = mod.parseChatCompletionChunk(
    '{"choices":[{"delta":{"content":"hi","reasoning_content":"why"}}]}',
    glmDialect
  );
  assert.equal(glmChunk.content, "hi");
  assert.equal(glmChunk.thinking, "why");
  assert.equal(mod.parseChatCompletionChunk("[DONE]", glmDialect), null);

  // OpenRouter dialect reads the `reasoning` field name instead.
  const orChunk = mod.parseChatCompletionChunk(
    '{"choices":[{"delta":{"reasoning":"think"}}]}',
    { ...glmDialect, providerId: "openrouter", thinkingForm: "reasoning" }
  );
  assert.equal(orChunk.thinking, "think");

  // Tool-call deltas accumulate by index across chunks; args concatenate.
  const acc = mod.createStreamAccumulator();
  mod.applyStreamDelta(acc, {
    toolCallDeltas: [{ id: "c1", index: 0, name: "read_file" }],
  });
  mod.applyStreamDelta(acc, {
    toolCallDeltas: [{ argumentsDelta: '{"path":"a"}', index: 0 }],
  });
  const calls = mod.materializeToolCalls(acc);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "read_file");
  assert.equal(calls[0].argumentsJson, '{"path":"a"}');

  // Reasoning flusher buffers small deltas and flushes on a sentence boundary.
  const flushed = [];
  const flusher = mod.createReasoningFlusher((c) => flushed.push(c));
  flusher.push("a".repeat(360));
  assert.equal(flushed.length, 0, "no boundary yet");
  flusher.push(". ");
  assert.equal(flushed.length, 1, "flushed on sentence boundary");

  // Think-tag splitter separates <think>..</think> from output across chunks.
  const splitter = mod.createThinkTagSplitter();
  const first = splitter.push("hello <think>plan");
  assert.equal(first.output, "hello ");
  assert.equal(first.thinking, "plan");
  const second = splitter.push("ning</think>done");
  assert.equal(second.output, "done");
  assert.equal(second.thinking, "ning");

  console.log("dialect-streaming tests passed");
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
