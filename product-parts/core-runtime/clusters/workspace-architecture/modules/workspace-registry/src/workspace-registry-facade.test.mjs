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

// A new registry is empty: no built-in project, nothing active.
const registry = new WorkspaceRegistryFacade();
assert.deepEqual(registry.getKnownWorkspaces(), []);
assert.equal(registry.getActiveWorkspace(), null);
assert.deepEqual(registry.getSnapshot(), {
  activeWorkspaceId: null,
  workspaces: [],
});
const workspace = registry.addWorkspace("/tmp/harness-ai-test-workspace");

assert.equal(registry.getKnownWorkspaces().length, 1);
assert.equal(workspace.name, "harness-ai-test-workspace");
assert.equal(
  registry.addWorkspace("/tmp/harness-ai-test-workspace").id,
  workspace.id
);
assert.equal(registry.getKnownWorkspaces().length, 1);
assert.equal(registry.getActiveWorkspace(), null, "adding does not select");
assert.equal(registry.selectWorkspace(workspace.id).id, workspace.id);
assert.equal(registry.getActiveWorkspace().id, workspace.id);
assert.throws(() => registry.selectWorkspace("missing-workspace"));

const restored = new WorkspaceRegistryFacade();
restored.restoreSnapshot(registry.getSnapshot());
assert.equal(restored.getActiveWorkspace().id, workspace.id);
assert.deepEqual(restored.getKnownWorkspaces(), [workspace]);

// An empty snapshot leaves the registry empty with no active project.
restored.restoreSnapshot({ activeWorkspaceId: null, workspaces: [] });
assert.deepEqual(restored.getKnownWorkspaces(), []);
assert.equal(restored.getActiveWorkspace(), null);

// An old snapshot: `harness-ai-local` is an ordinary, removable project; an
// unknown active id falls back to the first project.
const legacy = {
  id: "harness-ai-local",
  name: "Harness AI",
  path: "/Users/someone/harness-ai",
};
const other = { id: "workspace-other", name: "other", path: "/tmp/other" };
const old = new WorkspaceRegistryFacade();
old.restoreSnapshot({
  activeWorkspaceId: "harness-ai-local",
  workspaces: [legacy, other, { id: 1 }],
});
assert.deepEqual(old.getKnownWorkspaces(), [legacy, other]);
assert.equal(old.getActiveWorkspace().id, legacy.id);
assert.equal(old.removeWorkspace(legacy.id).id, legacy.id);
assert.equal(old.getActiveWorkspace().id, other.id, "next becomes active");
old.restoreSnapshot({ activeWorkspaceId: "missing", workspaces: [other] });
assert.equal(old.getActiveWorkspace().id, other.id);

// Removing the active project activates the first remaining one, then none.
const removable = new WorkspaceRegistryFacade();
const removed = removable.addWorkspace("/tmp/harness-ai-removed-workspace");
const kept = removable.addWorkspace("/tmp/harness-ai-kept-workspace");
removable.selectWorkspace(removed.id);
assert.equal(removable.removeWorkspace(removed.id).id, removed.id);
assert.equal(removable.getActiveWorkspace().id, kept.id);
assert.deepEqual(
  removable.getKnownWorkspaces().map((item) => item.id),
  [kept.id]
);
removable.removeWorkspace(removable.addWorkspace("/tmp/other").id);
assert.equal(removable.getActiveWorkspace().id, kept.id, "active stays");
assert.throws(() => removable.removeWorkspace(removed.id), /Unknown/u);
removable.removeWorkspace(kept.id);
assert.equal(removable.getActiveWorkspace(), null, "none remains");
assert.deepEqual(removable.getSnapshot(), {
  activeWorkspaceId: null,
  workspaces: [],
});
console.log("workspace-registry tests passed");
