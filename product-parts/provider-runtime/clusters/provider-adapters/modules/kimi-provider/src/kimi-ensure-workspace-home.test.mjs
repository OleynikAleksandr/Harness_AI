import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

globalThis.__kimiHomeCalls = [];
const source = readFileSync(
  new URL("./kimi-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerHomeManagerFacade \}[\s\S]*?provider-home-manager-facade\.js";\n/u,
    'const providerHomeManagerFacade = { resolveProviderHome: ({ providerId, workspacePath }) => workspacePath + "/.harness/runtime/providers/" + providerId + "/home" };\n'
  )
  .replace(
    /import \{ materializeKimiManagedAgentProfile \}[\s\S]*?kimi-managed-agent-profile\.js";\n/u,
    "const materializeKimiManagedAgentProfile = async (providerHomePath) => globalThis.__kimiHomeCalls.push(providerHomePath);\n"
  )
  .replace(
    /import \{ KimiProviderAdapter \} from "\.\/reference\/index\.js";\n/u,
    "class KimiProviderAdapter { constructor(options) { this.options = options; } }\n"
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { KimiProviderFacade } = await import(moduleUrl);

const facade = new KimiProviderFacade();
await facade.ensureWorkspaceHome("/tmp/workspace-a");
await facade.ensureWorkspaceHome("/tmp/workspace-a");

assert.deepEqual(globalThis.__kimiHomeCalls, [
  "/tmp/workspace-a/.harness/runtime/providers/kimi/home",
  "/tmp/workspace-a/.harness/runtime/providers/kimi/home",
]);
globalThis.__kimiHomeCalls = undefined;
