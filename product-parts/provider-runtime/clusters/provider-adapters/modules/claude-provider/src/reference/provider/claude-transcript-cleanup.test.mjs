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

const source = readFileSync(
  new URL("./claude-transcript-cleanup.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
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
mkdirSync(projectDir, { recursive: true });
const target = join(projectDir, "1def779f-41e3-4821-9411-52cd0a5d13b3.jsonl");
const other = join(projectDir, "00000000-0000-0000-0000-000000000000.jsonl");
const sharedConfig = join(home, ".claude.json");
writeFileSync(target, "x\n");
writeFileSync(other, "y\n");
writeFileSync(sharedConfig, "{}\n");

deleteClaudeTranscriptArtifacts(
  workspacePath,
  "1def779f-41e3-4821-9411-52cd0a5d13b3"
);
assert.equal(existsSync(target), false, "target transcript removed");
assert.equal(existsSync(other), true, "sibling transcript kept");
assert.equal(existsSync(sharedConfig), true, "shared .claude.json kept");

// Idempotent + tolerates a missing projects dir.
deleteClaudeTranscriptArtifacts(
  workspacePath,
  "1def779f-41e3-4821-9411-52cd0a5d13b3"
);
deleteClaudeTranscriptArtifacts(join(workspacePath, "nope"), "anything");

rmSync(workspacePath, { force: true, recursive: true });
