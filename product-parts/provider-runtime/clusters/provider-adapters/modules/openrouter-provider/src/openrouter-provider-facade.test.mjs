import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "openrouter-provider-facade.ts"),
  "utf8"
);
const coreRuntimeSource = readFileSync(
  join(
    moduleDir,
    "../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-adapter-registration.ts"
  ),
  "utf8"
);

assert.match(source, /extends OpenRouterProviderAdapter/u);
assert.match(source, /getProviderSettings\("openrouter"\)/u);
assert.match(source, /defaultEndpointTag: settings\.endpointTag/u);
// Retired legacy adapter (2026-07-05 cleanup): Core routing no longer builds
// this module; the directory awaits its removal task.
assert.doesNotMatch(coreRuntimeSource, /new OpenRouterProviderFacade\(/u);

for (const relativePath of [
  "reference/open-router-provider-adapter.ts",
  "reference/open-router-sse-reader.ts",
  "reference/codex-workflow-instruction-profile.ts",
  "reference/glm-native-agent-runtime.ts",
  "reference/glm-native-tool-executors.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
