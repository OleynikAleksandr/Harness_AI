import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

// Behaviour test of the workspace RPC: the real registry, stubbed session,
// provider home and provisioning dependencies.
const compile = (url) =>
  ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const dataUrl = (code) =>
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const registryUrl = dataUrl(
  compile(
    new URL(
      "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.ts",
      import.meta.url
    )
  )
);
const stubsUrl = dataUrl(`
export const calls = { provisioned: [], released: [], residue: [] };
export const sessionRequestHandlerFacade = {
  releaseWorkspaceSessions: (id) => { calls.released.push(id); return []; },
};
export const providerHomeManagerFacade = {
  removeWorkspaceResidue: async (path) => { calls.residue.push(path); return []; },
};
export const providerWorkspaceProvisionerFacade = {
  provisionWorkspace: async (request) => { calls.provisioned.push(request.workspaceId); },
};`);
const source = compile(new URL("./core-workspace-rpc.ts", import.meta.url))
  .replace(/"[^"]*workspace-registry-facade\.js"/u, `"${registryUrl}"`)
  .replace(/"[^"]*session-request-handler-facade\.js"/u, `"${stubsUrl}"`)
  .replace(/"[^"]*provider-home-manager-facade\.js"/u, `"${stubsUrl}"`)
  .replace(
    /"[^"]*provider-workspace-provisioner-facade\.js"/u,
    `"${stubsUrl}"`
  );
const { CoreWorkspaceRpc } = await import(dataUrl(source));
const { calls } = await import(stubsUrl);
const { workspaceRegistryFacade } = await import(registryUrl);

const home = mkdtempSync(join(tmpdir(), "harness-workspace-rpc-"));
const registryFile = join(home, "workspaces.json");
let adapterRegistrations = 0;
const rpc = new CoreWorkspaceRpc({
  registerAdapters: () => {
    adapterRegistrations += 1;
  },
  registryFile,
});
assert.equal(CoreWorkspaceRpc.handles("remove-workspace"), true);
assert.equal(CoreWorkspaceRpc.handles("list-sessions"), false);

const builtIn = rpc.invoke("list-workspaces");
assert.equal(builtIn.builtInWorkspaceId, builtIn.activeWorkspaceId);

// Opening a project selects it, persists the registry and provisions it.
const opened = rpc.invoke(
  "add-workspace",
  "/tmp/harness-rpc-project"
).workspace;
assert.equal(rpc.invoke("list-workspaces").activeWorkspaceId, opened.id);
assert.equal(existsSync(registryFile), true);
assert.equal(adapterRegistrations, 1);
assert.deepEqual(calls.provisioned, [opened.id]);

// The built-in workspace and unknown ids are refused.
assert.equal(
  (
    await rpc.invoke("remove-workspace", {
      workspaceId: builtIn.builtInWorkspaceId,
    })
  ).code,
  "BUILT_IN_WORKSPACE"
);
assert.equal(
  (await rpc.invoke("remove-workspace", { workspaceId: "missing" })).code,
  "UNKNOWN_WORKSPACE"
);

// Removing the active project forgets every app reference to it and falls
// back to the built-in workspace.
const removed = await rpc.invoke("remove-workspace", {
  workspaceId: opened.id,
});
assert.equal(removed.ok, true);
assert.equal(removed.activeWorkspaceId, builtIn.builtInWorkspaceId);
assert.equal(
  removed.workspaces.some((item) => item.id === opened.id),
  false
);
assert.deepEqual(calls.released, [opened.id]);
assert.deepEqual(calls.residue, ["/tmp/harness-rpc-project"]);
assert.equal(adapterRegistrations, 2, "the fallback workspace is activated");
assert.equal(
  JSON.parse(readFileSync(registryFile, "utf8")).workspaces.some(
    (item) => item.id === opened.id
  ),
  false
);

// Removing a project that is not active keeps the active one.
const active = rpc.invoke("add-workspace", "/tmp/harness-rpc-active").workspace;
const other = workspaceRegistryFacade.addWorkspace("/tmp/harness-rpc-other");
const kept = await rpc.invoke("remove-workspace", { workspaceId: other.id });
assert.equal(kept.activeWorkspaceId, active.id);
assert.equal(adapterRegistrations, 3, "no extra activation");

// A restart restores the persisted registry without the removed project.
workspaceRegistryFacade.restoreSnapshot({
  activeWorkspaceId: "",
  workspaces: [],
});
const restored = rpc.restore().map((item) => item.id);
assert.equal(restored.includes(active.id), true);
assert.equal(restored.includes(opened.id), false);

rmSync(home, { force: true, recursive: true });
console.log("core-workspace-rpc tests passed");
