import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const compile = (specifier) => {
  const source = readFileSync(new URL(specifier, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
};

const normalizerUrl = `data:text/javascript;base64,${Buffer.from(
  compile("../subagents/claude-subagent-event-normalizer.ts")
).toString("base64")}`;
const cleanupSource = compile("./claude-transcript-cleanup.ts").replace(
  "../subagents/claude-subagent-event-normalizer.js",
  normalizerUrl
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(cleanupSource).toString("base64")}`;
const { deleteClaudeTranscriptArtifacts } = await import(moduleUrl);

const workspacePath = mkdtempSync(join(tmpdir(), "harness-claude-transcript-"));
const home = join(
  workspacePath,
  ".harness",
  "runtime",
  "providers",
  "claude",
  "home"
);
const projectDir = join(home, ".claude", "projects", "-Users-x-Test-md");
const sessionId = "1def779f-41e3-4821-9411-52cd0a5d13b3";
const subagentsDir = join(projectDir, sessionId, "subagents");
mkdirSync(subagentsDir, { recursive: true });
const target = join(projectDir, `${sessionId}.jsonl`);
const other = join(projectDir, "00000000-0000-0000-0000-000000000000.jsonl");
const sharedConfig = join(home, ".claude.json");
const childMeta = join(subagentsDir, "agent-aaa111.meta.json");
const childTranscript = join(subagentsDir, "agent-aaa111.jsonl");
const siblingMeta = join(subagentsDir, "agent-bbb222.meta.json");
const siblingTranscript = join(subagentsDir, "agent-bbb222.jsonl");
writeFileSync(target, "x\n");
writeFileSync(other, "y\n");
writeFileSync(sharedConfig, "{}\n");
writeFileSync(childMeta, "{}\n");
writeFileSync(childTranscript, "z\n");
writeFileSync(siblingMeta, "{}\n");
writeFileSync(siblingTranscript, "w\n");

// Deleting one child removes only its meta/transcript pair.
deleteClaudeTranscriptArtifacts(workspacePath, "agent-aaa111");
assert.equal(existsSync(childMeta), false, "child meta removed");
assert.equal(existsSync(childTranscript), false, "child transcript removed");
assert.equal(existsSync(siblingMeta), true, "sibling subagent kept");
assert.equal(existsSync(siblingTranscript), true, "sibling transcript kept");
assert.equal(existsSync(target), true, "parent transcript kept");

// Deleting the parent removes its transcript and the whole session dir.
deleteClaudeTranscriptArtifacts(workspacePath, sessionId);
assert.equal(existsSync(target), false, "target transcript removed");
assert.equal(
  existsSync(join(projectDir, sessionId)),
  false,
  "session directory with subagents removed"
);
assert.equal(existsSync(other), true, "sibling transcript kept");
assert.equal(existsSync(sharedConfig), true, "shared .claude.json kept");

// Idempotent + tolerates a missing projects dir.
deleteClaudeTranscriptArtifacts(workspacePath, sessionId);
deleteClaudeTranscriptArtifacts(workspacePath, "agent-aaa111");
deleteClaudeTranscriptArtifacts(join(workspacePath, "nope"), "anything");

rmSync(workspacePath, { force: true, recursive: true });
console.log("claude-transcript-cleanup tests passed");
