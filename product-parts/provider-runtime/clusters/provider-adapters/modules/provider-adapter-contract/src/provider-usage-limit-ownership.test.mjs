import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const modulesRoot = resolve(
  "product-parts/provider-runtime/clusters/provider-adapters/modules"
);

assert.equal(
  existsSync(
    resolve(
      modulesRoot,
      "provider-adapter-contract/src/provider-usage-limit-readers.ts"
    )
  ),
  false
);

// The retired glm-native module (and its usage-limits reader) was removed by
// the 2026-07-05 legacy cleanup; the ACP kimi reader stays with the module
// kept alive behind the native capture feature.
for (const readerPath of [
  "claude-provider/src/claude-usage-limits-reader.ts",
  "codex-provider/src/reference/app-server/codex-app-server-usage-limits.ts",
  "kimi-provider/src/reference/provider/kimi-usage-limits-reader.ts",
]) {
  assert.equal(existsSync(resolve(modulesRoot, readerPath)), true, readerPath);
}
assert.equal(existsSync(resolve(modulesRoot, "glm-native-provider")), false);

const claudeFacade = readFileSync(
  resolve(modulesRoot, "claude-provider/src/claude-provider-facade.ts"),
  "utf8"
);
assert.equal(claudeFacade.includes("provider-usage-limit-readers"), false);
