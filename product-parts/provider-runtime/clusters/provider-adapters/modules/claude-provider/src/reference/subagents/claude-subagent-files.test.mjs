import assert from "node:assert/strict";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-subagent-files.ts", import.meta.url),
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
  createJsonlTailCursor,
  extractSubagentAsyncLaunch,
  extractSubagentTaskNotification,
  extractSubagentToolUseResult,
  findLatestSubagentCwd,
  findParentTranscriptPath,
  readJsonlRecordsFrom,
  resolveSubagentsDir,
  scanSubagentsDirectory,
} = await import(moduleUrl);

const root = mkdtempSync(join(tmpdir(), "harness-claude-subagent-files-"));
const projectDir = join(root, "projects", "-Users-x-Test-md");
const sessionId = "d47f61c9-64fa-4174-9b43-7fd4042f9ffc";
const parentPath = join(projectDir, `${sessionId}.jsonl`);
const subagentsDir = join(projectDir, sessionId, "subagents");
mkdirSync(subagentsDir, { recursive: true });

// resolveSubagentsDir derives the directory from the parent transcript path.
assert.equal(resolveSubagentsDir(parentPath), subagentsDir);

// findParentTranscriptPath scans slug directories (the CLI derives the slug
// from its cwd, so it is not knowable up front).
writeFileSync(parentPath, "");
const projectsDir = join(root, "projects");
assert.equal(
  await findParentTranscriptPath(projectsDir, sessionId),
  parentPath
);
assert.equal(await findParentTranscriptPath(projectsDir, "missing-id"), null);
assert.equal(
  await findParentTranscriptPath(join(root, "nope"), sessionId),
  null
);

// Directory scan pairs meta.json with the transcript path and skips noise.
writeFileSync(
  join(subagentsDir, "agent-a20d633996f34d4cc.meta.json"),
  JSON.stringify({
    agentType: "Explore",
    description: "Summarize archive batch 2",
    toolUseId: "toolu_014Cji3mLyQdGepV8xs1hCrc",
    spawnDepth: 1,
  })
);
writeFileSync(join(subagentsDir, "agent-a20d633996f34d4cc.jsonl"), "");
writeFileSync(join(subagentsDir, "agent-broken.meta.json"), "{not json");
writeFileSync(join(subagentsDir, "unrelated.txt"), "x");
const discoveries = await scanSubagentsDirectory(subagentsDir);
assert.equal(discoveries.length, 1, "one valid subagent discovered");
assert.deepEqual(discoveries[0].meta, {
  agentId: "a20d633996f34d4cc",
  agentType: "Explore",
  description: "Summarize archive batch 2",
  spawnDepth: 1,
  toolUseId: "toolu_014Cji3mLyQdGepV8xs1hCrc",
});
assert.equal(
  discoveries[0].transcriptPath,
  join(subagentsDir, "agent-a20d633996f34d4cc.jsonl")
);

// A worktree-isolated agent's meta.json records its worktree (CLI 2.1.317,
// Test_New_HarnesAI_002 2026-11-04); an empty value is dropped.
const worktreePath = "/Users/x/Test/.claude/worktrees/agent-a84de5f195192532e";
writeFileSync(
  join(subagentsDir, "agent-a84de5f195192532e.meta.json"),
  JSON.stringify({
    agentType: "general-purpose",
    description: "Executor T001: loader",
    spawnDepth: 1,
    spawnedWithWorktree: true,
    toolUseId: "toolu_018oGQDuH87nD3eWuMwpmZmH",
    worktreeBranch: "worktree-agent-a84de5f195192532e",
    worktreePath,
  })
);
writeFileSync(
  join(subagentsDir, "agent-aempty.meta.json"),
  JSON.stringify({ toolUseId: "toolu_empty", worktreePath: "" })
);
const isolated = await scanSubagentsDirectory(subagentsDir);
assert.equal(isolated.length, 3);
const metaOf = (agentId) =>
  isolated.find((discovery) => discovery.meta.agentId === agentId).meta;
assert.equal(metaOf("a84de5f195192532e").worktreePath, worktreePath);
assert.equal("worktreePath" in metaOf("aempty"), false);
assert.equal("worktreePath" in metaOf("a20d633996f34d4cc"), false);

// The latest non-empty transcript `cwd` is the agent's working directory.
assert.equal(
  findLatestSubagentCwd([
    { cwd: "/Users/x/Test", type: "user" },
    { cwd: worktreePath, type: "assistant" },
    { cwd: "", type: "attachment" },
    { type: "api-request" },
    null,
  ]),
  worktreePath
);
assert.equal(findLatestSubagentCwd([{ type: "user" }, "x"]), null);
assert.equal(findLatestSubagentCwd([]), null);

// A missing directory scans to an empty list.
assert.deepEqual(await scanSubagentsDirectory(join(root, "nope")), []);

// Incremental tail: only fully terminated lines advance the cursor.
const transcriptPath = discoveries[0].transcriptPath;
const cursor = createJsonlTailCursor();
appendFileSync(transcriptPath, `${JSON.stringify({ n: 1 })}\n`);
appendFileSync(transcriptPath, `{"n":2,"partial":`);
let records = await readJsonlRecordsFrom(transcriptPath, cursor);
assert.deepEqual(records, [{ n: 1 }], "partial trailing line stays unread");
records = await readJsonlRecordsFrom(transcriptPath, cursor);
assert.deepEqual(records, [], "no new complete lines");
appendFileSync(transcriptPath, `true}\n${JSON.stringify({ n: 3 })}\n`);
records = await readJsonlRecordsFrom(transcriptPath, cursor);
assert.deepEqual(
  records,
  [{ n: 2, partial: true }, { n: 3 }],
  "completed lines are read exactly once"
);
assert.deepEqual(
  await readJsonlRecordsFrom(join(root, "gone.jsonl"), cursor),
  []
);

// toolUseResult extraction from parent records.
const terminal = extractSubagentToolUseResult({
  timestamp: "2026-07-12T18:39:00.000Z",
  message: {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "toolu_x" }],
  },
  toolUseResult: {
    status: "completed",
    agentId: "a20d633996f34d4cc",
    resolvedModel: "claude-opus-4-8",
  },
});
assert.deepEqual(terminal, {
  agentId: "a20d633996f34d4cc",
  isError: false,
  resolvedModel: "claude-opus-4-8",
  status: "completed",
  timestamp: "2026-07-12T18:39:00.000Z",
});
const errored = extractSubagentToolUseResult({
  message: {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "toolu_y", is_error: true }],
  },
  toolUseResult: { agentId: "deadbeef" },
});
assert.equal(
  errored.status,
  "failed",
  "is_error without status maps to failed"
);
assert.equal(errored.isError, true);
assert.equal(extractSubagentToolUseResult({ toolUseResult: {} }), null);
assert.equal(extractSubagentToolUseResult({ type: "assistant" }), null);
assert.equal(extractSubagentToolUseResult(null), null);

// --- Background (async) subagents: the launch is not terminal; the end is a
// <task-notification> (CLI 2.1.317 records, Test_New_HarnesAI_001 2026-11-03).
const asyncLaunch = {
  type: "user",
  timestamp: "2026-11-03T17:41:00.893Z",
  message: {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "toolu_x", content: [] }],
  },
  toolUseResult: { agentId: "af9d4838769476ae5", status: "async_launched" },
};
assert.equal(extractSubagentToolUseResult(asyncLaunch), null);
assert.equal(extractSubagentAsyncLaunch(asyncLaunch), "af9d4838769476ae5");
assert.equal(
  extractSubagentAsyncLaunch({ toolUseResult: { agentId: "a" } }),
  null
);
const notification = (status) =>
  `<task-notification>\n<task-id>af9d4838769476ae5</task-id>\n<tool-use-id>toolu_x</tool-use-id>\n<status>${status}</status>\n<summary>Agent "Executor T003: zones" finished</summary>\n</task-notification>`;
assert.deepEqual(
  extractSubagentTaskNotification({
    type: "queue-operation",
    operation: "enqueue",
    timestamp: "2026-11-03T17:41:38.210Z",
    content: notification("completed"),
  }),
  {
    agentId: "af9d4838769476ae5",
    isError: false,
    status: "completed",
    timestamp: "2026-11-03T17:41:38.210Z",
  }
);
assert.equal(
  extractSubagentTaskNotification({
    type: "user",
    message: { role: "user", content: notification("failed") },
  }).isError,
  true
);
assert.equal(
  extractSubagentTaskNotification({
    type: "user",
    message: {
      role: "user",
      content: [{ type: "text", text: notification("killed") }],
    },
  }).status,
  "interrupted"
);
assert.equal(
  extractSubagentTaskNotification({ type: "user", message: { content: "hi" } }),
  null
);
assert.equal(
  extractSubagentTaskNotification({
    type: "queue-operation",
    content: "<task-notification><task-id>a</task-id></task-notification>",
  }),
  null,
  "a notification without status is ignored"
);

rmSync(root, { force: true, recursive: true });
console.log("claude-subagent-files tests passed");
