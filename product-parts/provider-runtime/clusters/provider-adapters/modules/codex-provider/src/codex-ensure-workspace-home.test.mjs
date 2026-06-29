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
await facade.ensureWorkspaceHome("/tmp/workspace-a");
await facade.ensureWorkspaceHome("/tmp/workspace-a");

assert.deepEqual(globalThis.__codexHomeCalls, [
  { providerId: "codex", workspacePath: "/tmp/workspace-a" },
  { providerId: "codex", workspacePath: "/tmp/workspace-a" },
]);
globalThis.__codexHomeCalls = undefined;
