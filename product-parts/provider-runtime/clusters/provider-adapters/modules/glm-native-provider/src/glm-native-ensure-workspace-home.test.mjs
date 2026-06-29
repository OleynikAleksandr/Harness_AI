import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const source = readFileSync(
  new URL("./glm-native-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerAuthStoreFacade \}[\s\S]*?provider-auth-store-facade\.js";\n/u,
    "const providerAuthStoreFacade = { getApiKey: () => null, getBaseUrl: () => null };\n"
  )
  .replace(
    /import \{ providerHomeManagerFacade \}[\s\S]*?provider-home-manager-facade\.js";\n/u,
    'const providerHomeManagerFacade = { resolveProviderHome: ({ providerId, workspacePath }) => workspacePath + "/.harness/runtime/providers/" + providerId + "/home" };\n'
  )
  .replace(
    /import \{ GlmProviderAdapter \} from "\.\/reference\/index\.js";\n/u,
    "class GlmProviderAdapter { constructor(options) { this.options = options; } }\n"
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { GlmNativeProviderFacade } = await import(moduleUrl);

const workspacePath = mkdtempSync(join(tmpdir(), "harness-glm-native-"));
const homePath = join(
  workspacePath,
  ".harness",
  "runtime",
  "providers",
  "glm-native",
  "home"
);

const facade = new GlmNativeProviderFacade(undefined, workspacePath);
await facade.ensureWorkspaceHome(workspacePath);
await facade.ensureWorkspaceHome(workspacePath);

assert.equal(existsSync(homePath), true);

rmSync(workspacePath, { force: true, recursive: true });
