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
