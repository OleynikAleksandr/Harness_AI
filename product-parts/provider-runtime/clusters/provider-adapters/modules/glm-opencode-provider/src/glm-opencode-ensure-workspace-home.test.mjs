import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

globalThis.__glmOpenCodeProfiles = [];
const source = readFileSync(
  new URL("./glm-opencode-provider-facade.ts", import.meta.url),
  "utf8"
)
  .replace(
    /import \{ providerHomeManagerFacade \}[\s\S]*?provider-home-manager-facade\.js";\n/u,
    'const providerHomeManagerFacade = { resolveProviderHome: ({ providerId, workspacePath }) => workspacePath + "/.harness/runtime/providers/" + providerId + "/home" };\n'
  )
  .replace(
    /import \{[\s\S]*?ensureGlmOpenCodeRuntimeProfile,[\s\S]*?\} from "\.\/reference\/provider\/glm-opencode-runtime-profile\.js";\n/u,
    "const buildGlmOpenCodeRuntimeProfile = (profile) => profile; const ensureGlmOpenCodeRuntimeProfile = (profile) => globalThis.__glmOpenCodeProfiles.push(profile);\n"
  )
  .replace(
    /import \{ GlmOpenCodeProviderAdapter \} from "\.\/reference\/index\.js";\n/u,
    ""
  );
const testSource = [
  "class GlmOpenCodeProviderAdapter { constructor(options) { this.options = options; } }",
  source,
].join("\n");
const compiled = ts.transpileModule(testSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { GlmOpenCodeProviderFacade } = await import(moduleUrl);

const facade = new GlmOpenCodeProviderFacade();
facade.ensureWorkspaceHome("/tmp/workspace-a");
facade.ensureWorkspaceHome("/tmp/workspace-a");

assert.deepEqual(
  globalThis.__glmOpenCodeProfiles.map((profile) => profile.providerHomePath),
  [
    "/tmp/workspace-a/.harness/runtime/providers/glm-opencode/home",
    "/tmp/workspace-a/.harness/runtime/providers/glm-opencode/home",
  ]
);
globalThis.__glmOpenCodeProfiles = undefined;
