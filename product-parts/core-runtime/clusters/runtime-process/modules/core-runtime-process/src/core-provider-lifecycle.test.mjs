import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Behaviour test of the provider lifecycle: the real workspace registry and
// stubbed provider, settings and adapter registration dependencies.
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
export const calls = { cleared: 0, readinessWorkspace: [], registered: [] };
let readinessListener = null;
export const emitReadiness = (change) => readinessListener?.(change);
export const providerAuthStoreFacade = { getBaseUrl: () => undefined };
export const providerLivenessCheckerFacade = {
  checkProvider: async () => undefined,
  checkProviders: async () => undefined,
};
export const providerReadinessRegistryFacade = {
  combine: (providerId, workspaceId) => ({ status: "ready", workspaceId }),
  subscribe: (listener) => { readinessListener = listener; return () => undefined; },
};
export const providerRegistryFacade = {
  clearAdapters: () => { calls.cleared += 1; },
  setReadinessWorkspace: (id) => { calls.readinessWorkspace.push(id); },
};
export const settingsStoreFacade = {
  getProviderModel: (providerId) => ({ providerId, selectedModel: "m" }),
  getSettings: () => ({ providers: { grok: { reasoningByModel: {} } } }),
};
export const ensureLocalModelsServer = async () => undefined;
export const registerProviderAdapterInstance = (providerId, model, path) => {
  calls.registered.push([providerId, path]);
};`);
const source = compile(new URL("./core-provider-lifecycle.ts", import.meta.url))
  .replace(/"[^"]*workspace-registry-facade\.js"/u, `"${registryUrl}"`)
  .replaceAll(/"(?:\.\.\/)+[^"]*-facade\.js"/gu, `"${stubsUrl}"`)
  .replace(/"\.\/core-local-server-autostart\.js"/u, `"${stubsUrl}"`)
  .replace(/"\.\/core-provider-adapter-registration\.js"/u, `"${stubsUrl}"`);
const { CoreProviderLifecycle, PROVIDER_IDS } = await import(dataUrl(source));
const { calls, emitReadiness } = await import(stubsUrl);
const { workspaceRegistryFacade } = await import(registryUrl);

const lifecycle = new CoreProviderLifecycle();
const events = [];
lifecycle.addStatusListener((event) => events.push(event));
lifecycle.subscribeReadiness();

// Without an active project the adapters are cleared and none is registered.
lifecycle.registerAdapters();
lifecycle.registerAdapter("codex");
assert.equal(calls.cleared, 1);
assert.deepEqual(calls.registered, []);
assert.deepEqual(calls.readinessWorkspace, [""]);
// Provisioning changes have no project to belong to; liveness still publishes.
emitReadiness({ providerId: "codex", scope: "provisioning", workspaceId: "w" });
assert.equal(events.length, 0);
emitReadiness({ providerId: "codex", scope: "liveness" });
assert.equal(events.at(-1).payload.workspaceId, "");

// With an active project every provider adapter is registered for it.
const workspace = workspaceRegistryFacade.addWorkspace(
  "/tmp/lifecycle-project"
);
workspaceRegistryFacade.selectWorkspace(workspace.id);
lifecycle.registerAdapters();
assert.equal(calls.cleared, 2);
assert.deepEqual(
  calls.registered,
  PROVIDER_IDS.map((providerId) => [providerId, "/tmp/lifecycle-project"])
);
assert.equal(calls.readinessWorkspace.at(-1), workspace.id);
emitReadiness({
  providerId: "codex",
  scope: "provisioning",
  workspaceId: workspace.id,
});
assert.equal(events.at(-1).payload.workspaceId, workspace.id);
console.log("core-provider-lifecycle tests passed");
