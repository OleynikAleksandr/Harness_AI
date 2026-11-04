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

const toDataUrl = (specifier, replacements = []) => {
  let output = ts.transpileModule(
    readFileSync(new URL(specifier, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  for (const [from, to] of replacements) {
    output = output.replace(from, to);
  }
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
};
const { ClaudeSubagentObserver } = await import(
  toDataUrl("./claude-subagent-observer.ts", [
    ["./claude-subagent-files.js", toDataUrl("./claude-subagent-files.ts")],
    [
      "./claude-subagent-event-normalizer.js",
      toDataUrl("./claude-subagent-event-normalizer.ts"),
    ],
  ])
);

const projectsDir = mkdtempSync(join(tmpdir(), "harness-claude-subagent-cwd-"));
const projectDir = join(projectsDir, "-Users-x-Test");
const parentId = "95067ebf-ba62-4476-885b-c2800fe861bf";
const parentPath = join(projectDir, `${parentId}.jsonl`);
const subagentsDir = join(projectDir, parentId, "subagents");
mkdirSync(subagentsDir, { recursive: true });
writeFileSync(parentPath, "");
const parentEvents = [];
const emitter = {
  emitToChild: () => undefined,
  emitToParent: (event) => parentEvents.push(event),
};

// --- Working directory (WorkflowKitExecutionModes.md, section 10.2): a
// worktree-isolated agent reports the meta worktreePath at spawn; other
// agents report the latest transcript cwd, re-emitted when it changes.
const worktree = "/Users/x/Test/.claude/worktrees/agent-hhh888";
writeFileSync(
  join(subagentsDir, "agent-hhh888.meta.json"),
  JSON.stringify({
    agentType: "general-purpose",
    description: "Executor T001",
    spawnDepth: 1,
    spawnedWithWorktree: true,
    toolUseId: "toolu_hhh888",
    worktreePath: worktree,
  })
);
const cwdRecord = (agentId, uuid, cwd, timestamp) =>
  `${JSON.stringify({
    agentId,
    ...(cwd === undefined ? {} : { cwd }),
    message: { content: [{ text: uuid, type: "text" }], role: "assistant" },
    timestamp,
    type: "assistant",
    uuid,
  })}\n`;
appendFileSync(
  join(subagentsDir, "agent-hhh888.jsonl"),
  cwdRecord("hhh888", "hhh888-r1", worktree, "2026-11-04T10:00:00.000Z")
);
writeFileSync(
  join(subagentsDir, "agent-iii999.meta.json"),
  JSON.stringify({ agentType: "Explore", toolUseId: "toolu_iii999" })
);
appendFileSync(
  join(subagentsDir, "agent-iii999.jsonl"),
  cwdRecord("iii999", "iii999-r1", undefined, "2026-11-04T10:00:00.000Z")
);
const cwdObserver = new ClaudeSubagentObserver({
  emitter,
  now: () => "cwd-ts",
  parentProviderSessionId: parentId,
  projectsDir,
});
const sessionEvents = (agentId) =>
  parentEvents.filter(
    (event) =>
      event.type === "subagent_session" &&
      event.providerSessionId === `agent-${agentId}`
  );
await cwdObserver.stopTurnPolling();
assert.equal(sessionEvents("hhh888").length, 1);
assert.equal(sessionEvents("hhh888")[0].workingDirectory, worktree);
assert.equal(sessionEvents("iii999").length, 1);
assert.equal(
  "workingDirectory" in sessionEvents("iii999")[0],
  false,
  "no cwd recorded yet: the field stays absent"
);
// Later records: the first cwd re-emits the session metadata once.
appendFileSync(
  join(subagentsDir, "agent-iii999.jsonl"),
  cwdRecord("iii999", "iii999-r2", "/Users/x/Test", "2026-11-04T10:01:00.000Z")
);
appendFileSync(
  join(subagentsDir, "agent-hhh888.jsonl"),
  cwdRecord(
    "hhh888",
    "hhh888-r2",
    `${worktree}/src`,
    "2026-11-04T10:01:00.000Z"
  )
);
await cwdObserver.stopTurnPolling();
assert.equal(
  sessionEvents("hhh888").length,
  1,
  "the worktree root stays the working directory of an isolated agent"
);
assert.equal(sessionEvents("iii999").length, 2);
assert.equal(sessionEvents("iii999")[1].workingDirectory, "/Users/x/Test");
assert.equal(sessionEvents("iii999")[1].status, "running");
assert.equal(sessionEvents("iii999")[1].timestamp, "2026-11-04T10:01:00.000Z");
// An unchanged cwd emits nothing; a changed one re-emits the latest.
appendFileSync(
  join(subagentsDir, "agent-iii999.jsonl"),
  cwdRecord("iii999", "iii999-r3", "/Users/x/Test", "2026-11-04T10:02:00.000Z")
);
await cwdObserver.stopTurnPolling();
assert.equal(sessionEvents("iii999").length, 2);
appendFileSync(
  join(subagentsDir, "agent-iii999.jsonl"),
  cwdRecord(
    "iii999",
    "iii999-r4",
    "/Users/x/Other",
    "2026-11-04T10:03:00.000Z"
  ) + cwdRecord("iii999", "iii999-r5", "", "2026-11-04T10:04:00.000Z")
);
await cwdObserver.stopTurnPolling();
assert.equal(sessionEvents("iii999").length, 3);
assert.equal(sessionEvents("iii999")[2].workingDirectory, "/Users/x/Other");

rmSync(projectsDir, { force: true, recursive: true });
console.log("claude-subagent-observer working directory tests passed");
