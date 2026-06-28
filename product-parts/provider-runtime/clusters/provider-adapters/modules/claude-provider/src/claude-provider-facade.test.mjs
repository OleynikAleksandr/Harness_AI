import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const moduleDir = new URL(".", import.meta.url);
const facadeSource = readFileSync(
  new URL("./claude-provider-facade.ts", moduleDir),
  "utf8"
);
const coreRuntimeSource = readFileSync(
  new URL(
    "../../../../../../core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts",
    moduleDir
  ),
  "utf8"
);
const referenceRoot = new URL("./reference", moduleDir);
const npmRunnerSource = readFileSync(
  new URL("./reference/installer/npm-runner.ts", moduleDir),
  "utf8"
);
const providerHomeSource = readFileSync(
  new URL("./reference/sdk/claude-provider-home.ts", moduleDir),
  "utf8"
);

assert.match(facadeSource, /extends ClaudeProviderAdapter/u);
assert.match(facadeSource, /from "\.\/reference\/index\.js"/u);
assert.doesNotMatch(facadeSource, /CliSessionProviderAdapter/u);
assert.match(
  coreRuntimeSource,
  /new ClaudeProviderFacade\(model, workspacePath\)/u
);
assert.match(npmRunnerSource, /GUI_NPM_PATHS/u);
assert.match(npmRunnerSource, /\/opt\/homebrew\/bin/u);
assert.match(npmRunnerSource, /buildNpmEnvironment/u);
assert.match(providerHomeSource, /HARNESS_CLAUDE_HOME/u);
assert.match(providerHomeSource, /"\.harness-ai"/u);
assert.match(providerHomeSource, /"\.harness"/u);
assert.doesNotMatch(providerHomeSource, /"\.codeai-hub"/u);

for (const path of [
  "sdk/claude-sdk-manager.ts",
  "installer/sdk-executable-path.ts",
  "session/session-manager.ts",
  "messaging/claude-stream-event-router.ts",
  "messaging/claude-thinking-dialog-emitter.ts",
  "sdk/claude-workspace-system-prompt.ts",
  "provider/claude-provider-adapter.ts",
]) {
  assert.equal(existsSync(join(referenceRoot.pathname, path)), true, path);
}
