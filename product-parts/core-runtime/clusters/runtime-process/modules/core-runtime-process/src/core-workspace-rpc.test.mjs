import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

// No built-in project: without a registry file Core starts empty, with no
// active project, and neither registers adapters nor provisions.
assert.deepEqual(rpc.restore(), []);
assert.deepEqual(rpc.invoke("list-workspaces"), {
  activeWorkspaceId: null,
  workspaces: [],
});
rpc.startProvisioning();
assert.deepEqual(calls.provisioned, []);
assert.equal(adapterRegistrations, 0);

// Opening a project selects it, persists the registry and provisions it.
const opened = rpc.invoke(
  "add-workspace",
  "/tmp/harness-rpc-project"
).workspace;
assert.equal(rpc.invoke("list-workspaces").activeWorkspaceId, opened.id);
assert.equal(existsSync(registryFile), true);
assert.equal(adapterRegistrations, 1);
assert.deepEqual(calls.provisioned, [opened.id]);
assert.equal(
  (await rpc.invoke("remove-workspace", { workspaceId: "missing" })).code,
  "UNKNOWN_WORKSPACE"
);

// Removing a project that is not active keeps the active one.
const other = workspaceRegistryFacade.addWorkspace("/tmp/harness-rpc-other");
const kept = await rpc.invoke("remove-workspace", { workspaceId: other.id });
assert.equal(kept.activeWorkspaceId, opened.id);
assert.equal(adapterRegistrations, 1, "no extra activation");

// Removing the active project forgets every app reference to it and
// activates the first remaining project.
const next = rpc.invoke("add-workspace", "/tmp/harness-rpc-next").workspace;
rpc.invoke("select-workspace", opened.id);
assert.equal(adapterRegistrations, 3);
const removed = await rpc.invoke("remove-workspace", {
  workspaceId: opened.id,
});
assert.equal(removed.ok, true);
assert.equal(removed.activeWorkspaceId, next.id);
assert.deepEqual(
  removed.workspaces.map((item) => item.id),
  [next.id]
);
assert.deepEqual(calls.released, [other.id, opened.id]);
assert.deepEqual(calls.residue, [
  "/tmp/harness-rpc-other",
  "/tmp/harness-rpc-project",
]);
assert.equal(adapterRegistrations, 4, "the next project is activated");
assert.equal(calls.provisioned.at(-1), next.id);
assert.equal(
  JSON.parse(readFileSync(registryFile, "utf8")).workspaces.some(
    (item) => item.id === opened.id
  ),
  false
);

// Removing the last project leaves no active project; the adapters are
// cleared through registerAdapters and nothing is provisioned.
const provisionedBefore = calls.provisioned.length;
const empty = await rpc.invoke("remove-workspace", { workspaceId: next.id });
assert.deepEqual(
  { activeWorkspaceId: empty.activeWorkspaceId, workspaces: empty.workspaces },
  { activeWorkspaceId: null, workspaces: [] }
);
assert.equal(adapterRegistrations, 5);
assert.equal(calls.provisioned.length, provisionedBefore);
assert.deepEqual(JSON.parse(readFileSync(registryFile, "utf8")), {
  activeWorkspaceId: null,
  workspaces: [],
});

// A restart restores the persisted registry without the removed project.
const active = rpc.invoke("add-workspace", "/tmp/harness-rpc-active").workspace;
workspaceRegistryFacade.restoreSnapshot({
  activeWorkspaceId: null,
  workspaces: [],
});
const restored = rpc.restore().map((item) => item.id);
assert.deepEqual(restored, [active.id]);
assert.equal(rpc.invoke("list-workspaces").activeWorkspaceId, active.id);

// An old registry file: `harness-ai-local` is an ordinary project that can be
// removed like any other.
writeFileSync(
  registryFile,
  JSON.stringify({
    activeWorkspaceId: "harness-ai-local",
    workspaces: [
      { id: "harness-ai-local", name: "Harness AI", path: "/tmp/harness-old" },
      active,
    ],
  })
);
assert.deepEqual(
  rpc.restore().map((item) => item.id),
  ["harness-ai-local", active.id]
);
assert.equal(
  rpc.invoke("list-workspaces").activeWorkspaceId,
  "harness-ai-local"
);
const legacy = await rpc.invoke("remove-workspace", {
  workspaceId: "harness-ai-local",
});
assert.equal(legacy.ok, true);
assert.equal(legacy.activeWorkspaceId, active.id);
assert.equal(calls.residue.at(-1), "/tmp/harness-old");

// An empty registry file restores an empty registry with no active project.
writeFileSync(registryFile, JSON.stringify({ workspaces: [] }));
assert.deepEqual(rpc.restore(), []);
assert.equal(rpc.invoke("list-workspaces").activeWorkspaceId, null);

rmSync(home, { force: true, recursive: true });
console.log("core-workspace-rpc tests passed");
