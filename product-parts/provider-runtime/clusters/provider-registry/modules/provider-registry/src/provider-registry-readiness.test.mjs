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
    "const providerDescriptorFacade = { getCapabilities: () => ({ modelSync: { acceptsAppliedTurnConfig: true, supportsReasoningSelection: true }, requiresProviderHome: true, supportsImmediateBinding: true }) };\n"
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

// Internal providers stay out of the visible picker but resolve by id.
assert.equal(
  registry.listProviders().some((provider) => provider.id === "kimi-client"),
  false
);
assert.equal(
  registry
    .listProviders()
    .every((provider) => provider.visibility === "visible"),
  true
);
const kimiClient = registry.getProvider("kimi-client");
assert.equal(kimiClient.visibility, "internal");
assert.equal(kimiClient.moduleId, "kimi-client-provider");
