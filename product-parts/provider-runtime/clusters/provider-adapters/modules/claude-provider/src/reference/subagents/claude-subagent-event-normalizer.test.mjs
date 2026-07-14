import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-subagent-event-normalizer.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const {
  buildClaudeSubagentSpawnEvents,
  buildClaudeSubagentTerminalStatusEvent,
  extractClaudeSubagentModel,
  extractClaudeSubagentTokenUsage,
  isClaudeChildProviderSessionId,
  mapClaudeSubagentTerminalStatus,
  normalizeClaudeSubagentTranscriptRecord,
  toClaudeChildProviderSessionId,
} = await import(moduleUrl);

// Child id shape.
assert.equal(toClaudeChildProviderSessionId("a20d"), "agent-a20d");
assert.equal(isClaudeChildProviderSessionId("agent-a20d"), true);
assert.equal(
  isClaudeChildProviderSessionId("d47f61c9-64fa-4174-9b43-7fd4042f9ffc"),
  false
);

// Spawn events carry the contract fields Core's lifecycle expects.
const meta = {
  agentId: "a20d633996f34d4cc",
  agentType: "Explore",
  description: "Summarize archive batch 2",
  spawnDepth: 1,
  toolUseId: "toolu_014Cji3mLyQdGepV8xs1hCrc",
};
const spawn = buildClaudeSubagentSpawnEvents({
  meta,
  parentProviderSessionId: "d47f61c9-64fa-4174-9b43-7fd4042f9ffc",
  timestamp: "2026-07-12T18:38:48.829Z",
});
assert.deepEqual(spawn.control, {
  action: "spawn",
  agentStates: [
    { providerSessionId: "agent-a20d633996f34d4cc", status: "running" },
  ],
  callId: "toolu_014Cji3mLyQdGepV8xs1hCrc",
  lifecycleStatus: "running",
  prompt: "Summarize archive batch 2",
  receiverProviderSessionIds: ["agent-a20d633996f34d4cc"],
  senderProviderSessionId: "d47f61c9-64fa-4174-9b43-7fd4042f9ffc",
  timestamp: "2026-07-12T18:38:48.829Z",
  type: "subagent_control",
});
assert.deepEqual(spawn.session, {
  agentRole: "Explore",
  parentProviderSessionId: "d47f61c9-64fa-4174-9b43-7fd4042f9ffc",
  providerSessionId: "agent-a20d633996f34d4cc",
  status: "running",
  task: "Summarize archive batch 2",
  timestamp: "2026-07-12T18:38:48.829Z",
  title: "Summarize archive batch 2",
  type: "subagent_session",
});

// Empty description falls back to the agent type; explicit status and model pass through.
const fallback = buildClaudeSubagentSpawnEvents({
  meta: { ...meta, description: "  " },
  model: "claude-opus-4-8",
  parentProviderSessionId: "parent",
  status: "interrupted",
  timestamp: "t",
});
assert.equal(fallback.control.prompt, "Explore");
assert.equal(fallback.control.model, "claude-opus-4-8");
assert.equal(fallback.session.status, "interrupted");
assert.deepEqual(fallback.control.agentStates, [
  { providerSessionId: "agent-a20d633996f34d4cc", status: "interrupted" },
]);

// Terminal status mapping.
assert.equal(
  mapClaudeSubagentTerminalStatus({
    agentId: "x",
    isError: false,
    status: "completed",
  }),
  "completed"
);
assert.equal(
  mapClaudeSubagentTerminalStatus({
    agentId: "x",
    isError: true,
    status: "completed",
  }),
  "failed"
);
assert.equal(
  mapClaudeSubagentTerminalStatus({
    agentId: "x",
    isError: false,
    status: "interrupted",
  }),
  "interrupted"
);
assert.equal(
  mapClaudeSubagentTerminalStatus({
    agentId: "x",
    isError: false,
    status: "weird",
  }),
  "failed"
);
assert.deepEqual(
  buildClaudeSubagentTerminalStatusEvent(
    {
      agentId: "a20d",
      isError: false,
      status: "completed",
      timestamp: "2026-07-12T18:39:34.000Z",
    },
    "fallback-ts"
  ),
  {
    providerSessionId: "agent-a20d",
    status: "completed",
    timestamp: "2026-07-12T18:39:34.000Z",
    type: "subagent_status",
  }
);
assert.equal(
  buildClaudeSubagentTerminalStatusEvent(
    { agentId: "a20d", isError: false, status: "completed" },
    "fallback-ts"
  ).timestamp,
  "fallback-ts"
);

// Transcript projection: text and thinking blocks with stable per-block uuids.
const record = {
  type: "assistant",
  uuid: "rec-1",
  timestamp: "2026-07-12T18:39:00.000Z",
  isSidechain: true,
  agentId: "a20d",
  message: {
    model: "claude-opus-4-8",
    role: "assistant",
    content: [
      { type: "thinking", thinking: "Let me read the files." },
      { type: "text", text: "Here is the summary." },
      { type: "tool_use", id: "toolu_z", name: "Read", input: {} },
      { type: "text", text: "   " },
    ],
  },
};
assert.deepEqual(normalizeClaudeSubagentTranscriptRecord(record, "fb"), [
  {
    content: "Let me read the files.",
    timestamp: "2026-07-12T18:39:00.000Z",
    type: "thinking",
    uuid: "rec-1::subagent::0",
  },
  {
    content: "Here is the summary.",
    timestamp: "2026-07-12T18:39:00.000Z",
    type: "assistant",
    uuid: "rec-1::subagent::1",
  },
]);
assert.equal(extractClaudeSubagentModel(record), "claude-opus-4-8");
assert.equal(extractClaudeSubagentModel({ message: {} }), null);

// Non-assistant and uuid-less records are skipped.
assert.deepEqual(
  normalizeClaudeSubagentTranscriptRecord(
    { type: "user", uuid: "u", message: { content: [] } },
    "fb"
  ),
  []
);
assert.deepEqual(
  normalizeClaudeSubagentTranscriptRecord(
    { type: "assistant", message: { content: [{ type: "text", text: "x" }] } },
    "fb"
  ),
  []
);

// Token usage extraction (Codex subagent parity): used = input +
// cache_read + cache_creation, cached = cache_read; empty or non-assistant
// records yield null.
assert.deepEqual(
  extractClaudeSubagentTokenUsage({
    type: "assistant",
    message: {
      usage: {
        input_tokens: 8,
        cache_read_input_tokens: 1200,
        cache_creation_input_tokens: 300,
        output_tokens: 40,
      },
    },
  }),
  { cached: 1200, used: 1508 }
);
assert.equal(
  extractClaudeSubagentTokenUsage({
    type: "assistant",
    message: { usage: { output_tokens: 5 } },
  }),
  null
);
assert.equal(
  extractClaudeSubagentTokenUsage({ type: "user", message: { usage: {} } }),
  null
);
assert.equal(extractClaudeSubagentTokenUsage({ type: "assistant" }), null);

console.log("claude-subagent-event-normalizer tests passed");
