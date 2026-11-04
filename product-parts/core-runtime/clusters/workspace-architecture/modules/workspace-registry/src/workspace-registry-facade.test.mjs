import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./workspace-registry-facade.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { WorkspaceRegistryFacade } = await import(moduleUrl);

const registry = new WorkspaceRegistryFacade();
const firstCount = registry.getKnownWorkspaces().length;
const workspace = registry.addWorkspace("/tmp/harness-ai-test-workspace");

assert.equal(registry.getKnownWorkspaces().length, firstCount + 1);
assert.equal(workspace.name, "harness-ai-test-workspace");
assert.equal(
  registry.addWorkspace("/tmp/harness-ai-test-workspace").id,
  workspace.id
);
assert.equal(registry.getKnownWorkspaces().length, firstCount + 1);
assert.equal(registry.selectWorkspace(workspace.id).id, workspace.id);
assert.equal(registry.getActiveWorkspace().id, workspace.id);
assert.throws(() => registry.selectWorkspace("missing-workspace"));

const restored = new WorkspaceRegistryFacade();
restored.restoreSnapshot(registry.getSnapshot());
assert.equal(restored.getActiveWorkspace().id, workspace.id);
assert.equal(
  restored
    .getKnownWorkspaces()
    .some((knownWorkspace) => knownWorkspace.id === workspace.id),
  true
);

// Removing a project forgets it and falls back to the built-in workspace.
const removable = new WorkspaceRegistryFacade();
const builtIn = removable.getActiveWorkspace();
assert.equal(removable.isBuiltInWorkspace(builtIn.id), true);
const removed = removable.addWorkspace("/tmp/harness-ai-removed-workspace");
const kept = removable.addWorkspace("/tmp/harness-ai-kept-workspace");
removable.selectWorkspace(removed.id);
assert.equal(removable.removeWorkspace(removed.id).id, removed.id);
assert.equal(removable.getActiveWorkspace().id, builtIn.id);
assert.deepEqual(
  removable.getKnownWorkspaces().map((item) => item.id),
  [builtIn.id, kept.id]
);
removable.selectWorkspace(kept.id);
removable.removeWorkspace(removable.addWorkspace("/tmp/other").id);
assert.equal(removable.getActiveWorkspace().id, kept.id, "active stays");
assert.throws(() => removable.removeWorkspace(builtIn.id), /built-in/u);
assert.throws(() => removable.removeWorkspace(removed.id), /Unknown/u);
