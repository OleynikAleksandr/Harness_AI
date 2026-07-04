import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./provider-registry-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import type \{ ProviderAdapter \}[\s\S]*?provider-adapter-contract-facade\.js";\n/u,
    ""
  )
  .replace(
    /import \{[\s\S]*?providerDescriptorFacade,[\s\S]*?\} from "\.\.\/\.\.\/provider-descriptor\/src\/provider-descriptor-facade\.js";\n/u,
    'const providerDescriptorFacade = { getCapabilities: () => ({ modelSync: { acceptsAppliedTurnConfig: true, supportsReasoningSelection: true }, requiresProviderHome: true, supportsImmediateBinding: true }), getClientModels: (providerId) => (providerId === "kimi-client" ? [{ id: "kimi-for-coding", label: "Kimi For Coding" }] : providerId === "glm-client" ? [{ id: "glm-5.2", label: "GLM 5.2" }, { id: "glm-5.1", label: "GLM 5.1" }] : []) };\n'
  )
  .replace(
    /import \{ providerReadinessRegistryFacade \}[\s\S]*?provider-readiness-registry-facade\.js";\n/u,
    'const providerReadinessRegistryFacade = { combine: (providerId, workspaceId) => ({ readinessStatus: workspaceId === "workspace-a" && providerId === "codex" ? "ready" : "checking" }) };\n'
  );
const testSource = [
  'const providerReadinessRegistryFacade = { combine: (providerId, workspaceId) => ({ readinessStatus: workspaceId === "workspace-a" && providerId === "codex" ? "ready" : "checking" }) };',
  source,
].join("\n");
const compiled = ts.transpileModule(testSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { ProviderRegistryFacade } = await import(moduleUrl);

const registry = new ProviderRegistryFacade();
registry.setReadinessWorkspace("workspace-a");

assert.equal(registry.getProvider("codex").readinessStatus, "ready");
assert.equal(registry.getProvider("claude").readinessStatus, "checking");

// Visibility switch applied: the visible Kimi is the universal-client
// endpoint; the ACP kimi stays internal but resolves by id for existing
// sessions. Never two Kimi entries in the picker at once.
const visible = registry.listProviders();
assert.equal(
  visible.every((provider) => provider.visibility === "visible"),
  true
);
assert.equal(visible.filter((provider) => provider.name === "Kimi").length, 1);
assert.equal(
  visible.some((provider) => provider.id === "kimi"),
  false
);
const kimiClient = registry.getProvider("kimi-client");
assert.equal(kimiClient.visibility, "visible");
assert.equal(kimiClient.moduleId, "kimi-client-provider");
assert.equal(kimiClient.defaultModelId, "kimi-for-coding");
const kimiAcp = registry.getProvider("kimi");
assert.equal(kimiAcp.visibility, "internal");
assert.equal(kimiAcp.defaultModelId, undefined);

const glmClient = registry.getProvider("glm-client");
assert.equal(glmClient.visibility, "internal");
assert.equal(glmClient.name, "GLM");
assert.equal(glmClient.moduleId, "glm-client-provider");
assert.equal(glmClient.defaultModelId, undefined);
