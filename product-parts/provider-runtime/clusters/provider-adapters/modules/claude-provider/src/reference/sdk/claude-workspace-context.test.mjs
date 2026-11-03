import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./claude-workspace-context.ts", import.meta.url),
  "utf8"
);
const managerSource = readFileSync(
  new URL("./claude-sdk-manager.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { appendClaudeWorkspaceContext, CLAUDE_HOST_RECOVERY_ENV } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

assert.deepEqual(CLAUDE_HOST_RECOVERY_ENV, {
  HARNESS_WORKFLOW_RECOVERY: "host",
});

// Native: the claude_code preset keeps its identity and gets `append`.
const native = { systemPrompt: { preset: "claude_code", type: "preset" } };
appendClaudeWorkspaceContext(native, "# Workflow\nT1");
assert.deepEqual(native.systemPrompt, {
  append: "# Workflow\nT1",
  preset: "claude_code",
  type: "preset",
});
appendClaudeWorkspaceContext(native, "more");
assert.equal(native.systemPrompt.append, "# Workflow\nT1\n\nmore");

// Managed and legacy: the string prompt ends with the context.
const managed = { systemPrompt: "Profile prompt" };
appendClaudeWorkspaceContext(managed, "# Workflow\nT1");
assert.equal(managed.systemPrompt, "Profile prompt\n\n# Workflow\nT1");
const empty = {};
appendClaudeWorkspaceContext(empty, "ctx");
assert.equal(empty.systemPrompt, "ctx");

// No context: nothing changes.
const untouched = { systemPrompt: "Legacy" };
appendClaudeWorkspaceContext(untouched, undefined);
appendClaudeWorkspaceContext(untouched, "   ");
assert.equal(untouched.systemPrompt, "Legacy");

// The manager stores the context on create and resume, applies it after
// the profile and passes the host recovery flag to the Claude process.
assert.match(
  managerSource,
  /session\.workspaceContext = startOptions\?\.workspaceContext;[\s\S]*session\.workspaceContext = startOptions\?\.workspaceContext;/u
);
assert.match(
  managerSource,
  /applyClaudeSessionProfile\(options, session\.sessionProfile\);\s*appendClaudeWorkspaceContext\(options, session\.workspaceContext\);/u
);
assert.match(
  managerSource,
  /env: \{ \.\.\.this\.resolveAuthEnvironment\(\), \.\.\.CLAUDE_HOST_RECOVERY_ENV \}/u
);
