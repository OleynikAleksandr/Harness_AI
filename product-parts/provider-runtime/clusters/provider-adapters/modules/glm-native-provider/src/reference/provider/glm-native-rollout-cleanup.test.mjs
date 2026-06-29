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
  new URL("./glm-native-rollout-cleanup.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { deleteGlmNativeRolloutArtifacts } = await import(moduleUrl);

const workspacePath = mkdtempSync(join(tmpdir(), "harness-glm-rollout-"));
const dayDir = join(
  workspacePath,
  ".harness",
  "runtime",
  "providers",
  "glm-native",
  "home",
  "sessions",
  "2026",
  "06",
  "29"
);
mkdirSync(dayDir, { recursive: true });
const target = join(dayDir, "glm-3a4a84b5-13c7-4b6e-9217-dff09a59e216.jsonl");
const other = join(dayDir, "glm-00000000-0000-0000-0000-000000000000.jsonl");
writeFileSync(target, "x\n");
writeFileSync(other, "y\n");

deleteGlmNativeRolloutArtifacts(
  workspacePath,
  "glm-3a4a84b5-13c7-4b6e-9217-dff09a59e216"
);
assert.equal(existsSync(target), false, "target rollout removed");
assert.equal(existsSync(other), true, "sibling rollout kept");

// Idempotent + tolerates a missing sessions dir.
deleteGlmNativeRolloutArtifacts(
  workspacePath,
  "glm-3a4a84b5-13c7-4b6e-9217-dff09a59e216"
);
deleteGlmNativeRolloutArtifacts(join(workspacePath, "nope"), "glm-anything");

rmSync(workspacePath, { force: true, recursive: true });
