import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "codex-provider-facade.ts"),
  "utf8"
);

assert.match(
  source,
  /import \{ CodexProviderAdapter \} from "\.\/reference\/index\.js"/u
);
assert.match(source, /extends CodexProviderAdapter/u);
assert.match(source, /process\.env\.CODEX_HOME = providerHome/u);
assert.match(
  source,
  /process\.env\.CODEX_SETTINGS_PATH = workspaceSettingsPath/u
);
assert.match(source, /defaultApprovalMode: "never"/u);
assert.match(source, /defaultSandboxMode: "danger-full-access"/u);

for (const relativePath of [
  "reference/provider/codex-provider-adapter.ts",
  "reference/app-server/codex-app-server-facade.ts",
  "reference/app-server/codex-app-server-event-router.ts",
  "reference/app-server/codex-reasoning-summary-stream-buffer.ts",
  "reference/app-server/process/codex-app-server-process.ts",
  "reference/app-server/process/codex-provider-home-config.ts",
]) {
  assert.equal(existsSync(join(moduleDir, relativePath)), true, relativePath);
}
