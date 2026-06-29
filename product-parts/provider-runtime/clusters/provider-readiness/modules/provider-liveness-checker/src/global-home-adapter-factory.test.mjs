import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("./global-home-adapter-factory.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import type \{ ProviderAdapter \}[\s\S]*?provider-adapter-contract-facade\.js";\n/u,
    ""
  )
  .replace(
    /import \{ providerHomeManagerFacade \}[\s\S]*?provider-home-manager-facade\.js";\n/u,
    'const providerHomeManagerFacade = { resolveProviderHome: ({ providerId }) => "/tmp/global/" + providerId + "/home" };\n'
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { GlobalHomeAdapterFactoryFacade } = await import(moduleUrl);

process.env.CODEX_HOME = "before-home";
process.env.CODEX_WORKSPACE_PATH = "before-workspace";
process.env.CODEX_SETTINGS_PATH = "before-settings";

let initializeSawHome = null;
await new GlobalHomeAdapterFactoryFacade().runGlobalHomePreflight({
  buildAdapter: ({ providerHomePath }) => ({
    initialize() {
      initializeSawHome = process.env.CODEX_HOME;
      assert.equal(providerHomePath, "/tmp/global/codex/home");
    },
  }),
  providerId: "codex",
});

assert.equal(initializeSawHome, "/tmp/global/codex/home");
assert.equal(process.env.CODEX_HOME, "before-home");
assert.equal(process.env.CODEX_WORKSPACE_PATH, "before-workspace");
assert.equal(process.env.CODEX_SETTINGS_PATH, "before-settings");
