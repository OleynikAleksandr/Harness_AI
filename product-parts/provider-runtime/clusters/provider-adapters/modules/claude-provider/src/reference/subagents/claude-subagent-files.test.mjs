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
  extractSubagentToolUseResult,
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

rmSync(root, { force: true, recursive: true });
console.log("claude-subagent-files tests passed");
