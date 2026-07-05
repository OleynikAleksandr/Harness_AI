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

// Only the two native vendor channels keep a usage-limits reader. The retired
// glm-native reader left with the 2026-07-05 legacy cleanup, and the ACP kimi
// reader left with the kimi-provider retirement (same day).
for (const readerPath of [
  "claude-provider/src/claude-usage-limits-reader.ts",
  "codex-provider/src/reference/app-server/codex-app-server-usage-limits.ts",
]) {
  assert.equal(existsSync(resolve(modulesRoot, readerPath)), true, readerPath);
}
assert.equal(existsSync(resolve(modulesRoot, "glm-native-provider")), false);
assert.equal(existsSync(resolve(modulesRoot, "kimi-provider")), false);

const claudeFacade = readFileSync(
  resolve(modulesRoot, "claude-provider/src/claude-provider-facade.ts"),
  "utf8"
);
assert.equal(claudeFacade.includes("provider-usage-limit-readers"), false);
