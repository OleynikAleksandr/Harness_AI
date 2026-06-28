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
  new URL("./codex-rollout-cleanup.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { deleteCodexRolloutArtifacts } = await import(moduleUrl);

const workspacePath = mkdtempSync(join(tmpdir(), "harness-codex-rollout-"));
const dayDir = join(
  workspacePath,
  ".harness",
  "runtime",
  "providers",
  "codex",
  "home",
  "sessions",
  "2026",
  "06",
  "28"
);
mkdirSync(dayDir, { recursive: true });
const target = join(dayDir, "rollout-2026-06-28T21-36-51-target-id.jsonl");
const other = join(dayDir, "rollout-2026-06-28T22-00-00-other-id.jsonl");
writeFileSync(target, "x\n");
writeFileSync(other, "y\n");

deleteCodexRolloutArtifacts(workspacePath, "target-id");
assert.equal(existsSync(target), false, "target rollout removed");
assert.equal(existsSync(other), true, "sibling rollout kept");

// Idempotent + tolerates a missing sessions dir.
deleteCodexRolloutArtifacts(workspacePath, "target-id");
deleteCodexRolloutArtifacts(join(workspacePath, "nope"), "anything");

rmSync(workspacePath, { force: true, recursive: true });
