import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-workspace-provisioner-facade.ts", import.meta.url),
  "utf8"
)
  .replace(/^import[\s\S]*?;\n/gmu, "")
  .replace(/export const providerWorkspaceProvisionerFacade[\s\S]*?;\n/u, "");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ProviderWorkspaceProvisionerFacade } = await import(moduleUrl);

const changes = [];
const provisioned = [];
await new ProviderWorkspaceProvisionerFacade({
  providerRegistry: {
    getAdapter(providerId) {
      return providerId === "codex"
        ? {
            ensureWorkspaceHome(workspacePath) {
              provisioned.push(workspacePath);
            },
          }
        : null;
    },
    listProviders: () => [{ id: "codex" }, { id: "openrouter" }],
  },
  readinessRegistry: {
    setProvisioning(providerId, workspaceId, status, message) {
      changes.push({ message, providerId, status, workspaceId });
    },
  },
}).provisionWorkspace({
  workspaceId: "workspace-a",
  workspacePath: "/tmp/workspace-a",
});

assert.deepEqual(provisioned, ["/tmp/workspace-a"]);
assert.deepEqual(
  changes.map(({ providerId, status }) => `${providerId}:${status}`),
  ["codex:preparing", "codex:ready", "openrouter:preparing", "openrouter:ready"]
);

const failures = [];
await new ProviderWorkspaceProvisionerFacade({
  providerRegistry: {
    getAdapter: () => ({
      ensureWorkspaceHome() {
        throw new Error("missing auth");
      },
    }),
    listProviders: () => [{ id: "codex" }],
  },
  readinessRegistry: {
    setProvisioning(providerId, workspaceId, status, message) {
      failures.push({ message, providerId, status, workspaceId });
    },
  },
}).provisionWorkspace({
  workspaceId: "workspace-a",
  workspacePath: "/tmp/workspace-a",
});

assert.deepEqual(failures.at(-1), {
  message: "missing auth",
  providerId: "codex",
  status: "failed",
  workspaceId: "workspace-a",
});
