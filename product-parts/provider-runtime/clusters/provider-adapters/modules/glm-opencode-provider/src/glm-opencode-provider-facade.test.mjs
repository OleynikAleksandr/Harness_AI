import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "glm-opencode-provider-facade.ts"),
  "utf8"
);
const coreRuntimeSource = readFileSync(
  join(
    moduleDir,
    "../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-adapter-registration.ts"
  ),
  "utf8"
);
const runtimeProfileSource = readFileSync(
  join(moduleDir, "reference/provider/glm-opencode-runtime-profile.ts"),
  "utf8"
);
const turnStreamSource = readFileSync(
  join(moduleDir, "reference/provider/glm-opencode-turn-stream.ts"),
  "utf8"
);

assert.match(
  source,
  /import \{ GlmOpenCodeProviderAdapter \} from "\.\/reference\/index\.js"/u
);
assert.match(source, /extends GlmOpenCodeProviderAdapter/u);
assert.match(source, /providerHomePath\?: string/u);
assert.match(source, /providerHomePath \?\?\s+path\.join\(/u);
assert.match(source, /settingsPath: workspaceSettingsPath\(workspacePath\)/u);
assert.match(runtimeProfileSource, /\.harness-ai/u);
assert.match(runtimeProfileSource, /HARNESS_GLM_OPENCODE_COMMAND/u);
assert.match(turnStreamSource, /title: "harness-ai"/u);
assert.doesNotMatch(runtimeProfileSource, /"\.codeai-hub"|~\/\.codeai-hub/u);
assert.doesNotMatch(coreRuntimeSource, /GlmOpenCodeProviderFacade/u);

for (const relativePath of [
  "reference/provider/glm-opencode-provider-adapter.ts",
  "reference/provider/glm-opencode-runner.ts",
  "reference/provider/glm-opencode-runtime-profile.ts",
  "reference/provider/glm-opencode-sse-processor.ts",
  "reference/provider/glm-opencode-turn-stream.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
