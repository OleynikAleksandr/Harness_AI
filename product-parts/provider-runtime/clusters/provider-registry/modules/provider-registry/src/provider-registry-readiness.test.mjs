import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const descriptorSource = readFileSync(
  new URL(
    "../../provider-descriptor/src/provider-descriptor-facade.ts",
    import.meta.url
  ),
  "utf8"
);

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
assert.throws(() => registry.getProvider("codex-uc"), /Unknown provider/u);
assert.match(descriptorSource, /codex: \[\s+\{ id: "gpt-5\.6-sol"/u);
assert.match(descriptorSource, /\{ id: "gpt-5\.6-terra"/u);
assert.match(descriptorSource, /\{ id: "gpt-5\.6-luna"/u);
const captureCatalogSource = descriptorSource.slice(
  descriptorSource.indexOf("const CAPTURABLE_MODELS")
);
assert.doesNotMatch(captureCatalogSource, /codex: \[\s+\{ id: "gpt-5\.2"/u);

// The visible Kimi is the universal-client endpoint; the ACP kimi id/module
// was removed by the kimi-provider retirement (2026-07-05 user order), so no
// registry entry resolves for it anymore.
const visible = registry.listProviders();
assert.equal(
  visible.every((provider) => provider.visibility === "visible"),
  true
);
assert.equal(visible.filter((provider) => provider.name === "Kimi").length, 1);
const kimiClient = registry.getProvider("kimi-client");
assert.equal(kimiClient.visibility, "visible");
assert.equal(kimiClient.moduleId, "kimi-client-provider");
assert.equal(kimiClient.defaultModelId, "kimi-for-coding");
assert.throws(() => registry.getProvider("kimi"), /Unknown provider/u);

const glmClient = registry.getProvider("glm-client");
assert.equal(visible.filter((provider) => provider.name === "GLM").length, 1);
assert.equal(glmClient.visibility, "visible");
assert.equal(glmClient.name, "GLM");
assert.equal(glmClient.moduleId, "glm-client-provider");
assert.equal(glmClient.defaultModelId, undefined);
// Retired legacy ids are fully removed (2026-07-05 cleanup): no registry
// entry resolves for them anymore.
assert.throws(() => registry.getProvider("glm-opencode"), /Unknown provider/u);
assert.throws(() => registry.getProvider("glm-native"), /Unknown provider/u);
assert.throws(() => registry.getProvider("openrouter"), /Unknown provider/u);
assert.throws(() => registry.getProvider("local-models"), /Unknown provider/u);

// Phase 4 visibility switch applied: the visible Local Models is the
// universal-client endpoint (no static defaultModelId — live catalog).
const localModelsClient = registry.getProvider("local-models-client");
assert.equal(localModelsClient.visibility, "visible");
assert.equal(localModelsClient.moduleId, "local-models-client-provider");
assert.equal(localModelsClient.defaultModelId, undefined);
assert.equal(
  visible.filter((provider) => provider.name === "Local Models").length,
  1
);

// Same applied switch for OpenRouter: the client endpoint owns the single
// visible entry (live slug catalog, no static defaultModelId).
const openRouterClient = registry.getProvider("openrouter-client");
assert.equal(openRouterClient.visibility, "visible");
assert.equal(openRouterClient.moduleId, "openrouter-client-provider");
assert.equal(openRouterClient.defaultModelId, undefined);
assert.equal(
  visible.filter((provider) => provider.name === "OpenRouter").length,
  1
);
