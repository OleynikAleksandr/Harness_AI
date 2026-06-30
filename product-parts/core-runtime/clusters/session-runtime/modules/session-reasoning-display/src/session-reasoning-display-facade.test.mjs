import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./session-reasoning-display-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { SessionReasoningDisplayFacade } = await import(moduleUrl);

const facade = new SessionReasoningDisplayFacade();

assert.deepEqual(
  facade.projectProviderEvent({
    content: "checking tools",
    tag: "thinking",
    timestamp: "2026-06-28T00:00:00.000Z",
    type: "dialog_message",
    uuid: "codex-reasoning",
  }),
  [
    {
      id: "codex-reasoning",
      role: "thinking",
      tag: "thinking",
      text: "checking tools",
      timestamp: "2026-06-28T00:00:00.000Z",
    },
  ]
);

assert.deepEqual(
  facade.projectProviderEvent({
    content: "<think>plan first</think>final answer",
    timestamp: "2026-06-28T00:00:01.000Z",
    type: "dialog_message",
    uuid: "tagged",
  }),
  [
    {
      id: "tagged::thinking::0",
      role: "thinking",
      tag: "thinking",
      text: "plan first",
      timestamp: "2026-06-28T00:00:01.000Z",
    },
    {
      id: "tagged::assistant::1",
      role: "assistant",
      text: "final answer",
      timestamp: "2026-06-28T00:00:01.000Z",
    },
  ]
);

assert.deepEqual(
  facade.projectProviderEvent({
    data: {
      content: "visible answer",
      reasoning_content: "visible reasoning",
    },
    timestamp: "2026-06-28T00:00:02.000Z",
    type: "stream_event",
    uuid: "glm-chunk",
  }),
  [
    {
      id: "glm-chunk::thinking::0",
      role: "thinking",
      tag: "thinking",
      text: "visible reasoning",
      timestamp: "2026-06-28T00:00:02.000Z",
    },
    {
      id: "glm-chunk::content::assistant::0",
      role: "assistant",
      text: "visible answer",
      timestamp: "2026-06-28T00:00:02.000Z",
    },
  ]
);

assert.deepEqual(
  facade.projectProviderEvent({
    content: " world",
    tag: "live",
    timestamp: "2026-06-28T00:00:03.000Z",
    type: "assistant",
    uuid: "live-chunk",
  }),
  [
    {
      id: "live-chunk::assistant::0",
      role: "assistant",
      tag: "live",
      text: " world",
      timestamp: "2026-06-28T00:00:03.000Z",
    },
  ]
);

assert.deepEqual(
  facade.projectProviderEvent({
    content: "Inspecting the workspace before editing.",
    role: "assistant",
    tag: "thinking",
    timestamp: "2026-06-28T00:00:04.000Z",
    type: "dialog_message",
    uuid: "claude-message::thinking_live::0",
  }),
  [
    {
      id: "claude-message::thinking_live::0",
      role: "thinking",
      tag: "thinking",
      text: "Inspecting the workspace before editing.",
      timestamp: "2026-06-28T00:00:04.000Z",
    },
  ]
);

assert.deepEqual(
  facade.projectProviderEvent({
    data: {
      content: "Done.",
      thinking: [{ text: "Reading the relevant files." }],
    },
    timestamp: "2026-06-28T00:00:05.000Z",
    type: "stream_event",
    uuid: "claude-stream",
  }),
  [
    {
      id: "claude-stream::thinking::0",
      role: "thinking",
      tag: "thinking",
      text: "Reading the relevant files.",
      timestamp: "2026-06-28T00:00:05.000Z",
    },
    {
      id: "claude-stream::content::assistant::0",
      role: "assistant",
      text: "Done.",
      timestamp: "2026-06-28T00:00:05.000Z",
    },
  ]
);
