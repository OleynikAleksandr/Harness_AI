import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(moduleDir, "kimi-provider-facade.ts"), "utf8");
const coreRuntimeSource = readFileSync(
  join(
    moduleDir,
    "../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-adapter-registration.ts"
  ),
  "utf8"
);
const managedProfileSource = readFileSync(
  join(moduleDir, "reference/provider/kimi-managed-agent-profile.ts"),
  "utf8"
);

assert.match(
  source,
  /import \{ KimiProviderAdapter \} from "\.\/reference\/index\.js"/u
);
assert.match(source, /extends KimiProviderAdapter/u);
assert.match(source, /providerHomePath\?: string/u);
assert.match(source, /providerHomePath \?\?\s+path\.join\(/u);
assert.match(source, /"\.harness"/u);
assert.match(managedProfileSource, /"\.harness-ai"/u);
assert.match(managedProfileSource, /"\.harness"/u);
assert.doesNotMatch(managedProfileSource, /"\.codeai-hub"/u);
assert.match(source, /thinkingEnabled: true/u);
// Retired ACP adapter (2026-07-05 user order): Core routing no longer builds
// this module; the directory awaits its removal in the atomic id/module
// deletion task.
assert.doesNotMatch(coreRuntimeSource, /KimiProviderFacade/u);

for (const relativePath of [
  "reference/provider/kimi-provider-adapter.ts",
  "reference/provider/kimi-managed-agent-profile.ts",
  "reference/provider/kimi-session-event-router.ts",
  "reference/session/kimi-session-lifecycle.ts",
  "reference/wire/kimi-wire-process.ts",
  "reference/wire/kimi-wire-router.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
