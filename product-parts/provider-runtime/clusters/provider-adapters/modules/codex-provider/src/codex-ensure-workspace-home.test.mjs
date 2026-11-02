import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

globalThis.__codexHomeCalls = [];
const source = readFileSync(
  new URL("./codex-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerHomeManagerFacade \}[\s\S]*?provider-home-manager-facade\.js";\n/u,
    "const providerHomeManagerFacade = { prepareCodexHome: async (request) => globalThis.__codexHomeCalls.push(request) };\n"
  )
  .replace(
    /import \{ CodexProviderAdapter \} from "\.\/reference\/index\.js";\n/u,
    "class CodexProviderAdapter { constructor(options) { this.options = options; } }\n"
  )
  .replace(
    /import \{ providerDescriptorFacade \}[\s\S]*?provider-descriptor-facade\.js";\n/u,
    'const providerDescriptorFacade = { getCodexModels: () => [{ id: "gpt-6.1-sol", label: "GPT-6.1-Sol" }] };\n'
  )
  .replace(
    /export \{ refreshCodexModelCatalog \} from "\.\/codex-model-catalog\.js";\n/u,
    ""
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { CodexProviderFacade } = await import(moduleUrl);

const facade = new CodexProviderFacade();
// Without a Core model the facade starts on the first served catalog model.
assert.equal(facade.options.workspace.defaultModel, "gpt-6.1-sol");
await facade.ensureWorkspaceHome("/tmp/workspace-a");
await facade.ensureWorkspaceHome("/tmp/workspace-a");

assert.deepEqual(globalThis.__codexHomeCalls, [
  { providerId: "codex", workspacePath: "/tmp/workspace-a" },
  { providerId: "codex", workspacePath: "/tmp/workspace-a" },
]);
globalThis.__codexHomeCalls = undefined;
