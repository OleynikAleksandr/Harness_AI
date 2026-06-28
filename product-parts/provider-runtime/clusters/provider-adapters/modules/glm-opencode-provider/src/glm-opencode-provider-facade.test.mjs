import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "glm-opencode-provider-facade.ts"),
  "utf8"
);
const bridgeSource = readFileSync(
  join(
    moduleDir,
    "../../../../../../application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs"
  ),
  "utf8"
);

assert.match(
  source,
  /import \{ GlmOpenCodeProviderAdapter \} from "\.\/reference\/index\.js"/u
);
assert.match(source, /extends GlmOpenCodeProviderAdapter/u);
assert.match(source, /providerHomePath: path\.join\(/u);
assert.match(source, /settingsPath: workspaceSettingsPath\(workspacePath\)/u);
assert.match(
  bridgeSource,
  /new runtime\.GlmOpenCodeProviderFacade\(model\(providerId\), workspacePath\)/u
);

for (const relativePath of [
  "reference/provider/glm-opencode-provider-adapter.ts",
  "reference/provider/glm-opencode-runner.ts",
  "reference/provider/glm-opencode-runtime-profile.ts",
  "reference/provider/glm-opencode-sse-processor.ts",
  "reference/provider/glm-opencode-turn-stream.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
