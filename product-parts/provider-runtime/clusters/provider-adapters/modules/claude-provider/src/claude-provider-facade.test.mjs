import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const moduleDir = new URL(".", import.meta.url);
const facadeSource = readFileSync(
  new URL("./claude-provider-facade.ts", moduleDir),
  "utf8"
);
const bridgeSource = readFileSync(
  new URL(
    "../../../../../../application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
    moduleDir
  ),
  "utf8"
);
const referenceRoot = new URL("./reference", moduleDir);

assert.match(facadeSource, /extends ClaudeProviderAdapter/u);
assert.match(facadeSource, /from "\.\/reference\/index\.js"/u);
assert.doesNotMatch(facadeSource, /CliSessionProviderAdapter/u);
assert.match(
  bridgeSource,
  /new runtime\.ClaudeProviderFacade\(model\(providerId\), workspacePath\)/u
);

for (const path of [
  "sdk/claude-sdk-manager.ts",
  "session/session-manager.ts",
  "messaging/claude-stream-event-router.ts",
  "messaging/claude-thinking-dialog-emitter.ts",
  "provider/claude-provider-adapter.ts",
]) {
  assert.equal(existsSync(join(referenceRoot.pathname, path)), true, path);
}
