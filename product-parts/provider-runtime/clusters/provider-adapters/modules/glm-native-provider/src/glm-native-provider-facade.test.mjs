import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "glm-native-provider-facade.ts"),
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
  join(moduleDir, "reference/provider/glm-native-runtime-profile.ts"),
  "utf8"
);

assert.match(
  source,
  /import \{ GlmProviderAdapter \} from "\.\/reference\/index\.js"/u
);
assert.match(source, /extends GlmProviderAdapter/u);
assert.match(source, /providerAuthStoreFacade\.getApiKey\("glm-native"\)/u);
assert.match(source, /providerHomePath\?: string/u);
assert.match(source, /providerHomePath \?\?\s+path\.join\(/u);
assert.match(source, /settingsPath: workspaceSettingsPath\(workspacePath\)/u);
assert.match(runtimeProfileSource, /"\.harness-ai"/u);
assert.match(runtimeProfileSource, /HARNESS_GLOBAL_SETTINGS_PATH/u);
assert.doesNotMatch(runtimeProfileSource, /"\.codeai-hub"|~\/\.codeai-hub/u);
// Retired legacy adapter (2026-07-05 cleanup): Core routing no longer builds
// this module; the directory awaits its removal task.
assert.doesNotMatch(coreRuntimeSource, /GlmNativeProviderFacade/u);

for (const relativePath of [
  "reference/provider/glm-native-provider-adapter.ts",
  "reference/provider/glm-native-agent-runtime.ts",
  "reference/provider/glm-native-sse-parser.ts",
  "reference/provider/glm-native-stream-reader.ts",
  "reference/provider/glm-native-tool-executors.ts",
  "reference/provider/glm-usage-limits-reader.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
