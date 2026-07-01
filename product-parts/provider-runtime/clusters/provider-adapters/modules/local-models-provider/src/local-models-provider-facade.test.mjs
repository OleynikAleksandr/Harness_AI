import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "local-models-provider-facade.ts"),
  "utf8"
);
const coreRuntimeSource = readFileSync(
  join(
    moduleDir,
    "../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-adapter-registration.ts"
  ),
  "utf8"
);

assert.match(source, /extends LocalModelsProviderAdapter/u);
assert.match(source, /CODEAI_LMSTUDIO_DEFAULT_MODEL/u);
assert.match(
  coreRuntimeSource,
  /new LocalModelsProviderFacade\(model \?\? undefined\)/u
);

for (const relativePath of [
  "reference/local-models-provider-adapter.ts",
  "reference/local-models-facade.ts",
  "reference/local-models-runtime-load-manager.ts",
  "reference/local-models-sse-reader.ts",
  "reference/local-models-workflow-artifact-tool.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
