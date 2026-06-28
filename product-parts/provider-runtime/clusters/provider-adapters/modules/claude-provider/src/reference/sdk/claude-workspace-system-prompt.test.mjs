import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-workspace-system-prompt.ts", import.meta.url),
  "utf8"
).replace(
  "./claude-workflow-system-prompt.js",
  "data:text/javascript;base64,ZXhwb3J0IGNvbnN0IENPREVBSV9DTEFVREVfV09SS0ZMT1dfU1lTVEVNX1BST01QVCA9ICJCYXNlIHByb21wdCI7"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { buildClaudeWorkspaceSystemPrompt } = await import(moduleUrl);

const workspace = mkdtempSync(join(tmpdir(), "harness-claude-prompt-"));
try {
  writeFileSync(
    join(workspace, "AGENTS.md"),
    "# Rules\n\nUse workspace truth."
  );
  const prompt = buildClaudeWorkspaceSystemPrompt(workspace);

  assert.match(prompt, /Base prompt/u);
  assert.match(prompt, new RegExp(`Workspace path: ${workspace}`, "u"));
  assert.match(prompt, /# Workspace AGENTS\.md/u);
  assert.match(prompt, /Use workspace truth\./u);
} finally {
  rmSync(workspace, { force: true, recursive: true });
}
