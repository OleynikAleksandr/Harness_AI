import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  join(moduleDir, "codex-provider-facade.ts"),
  "utf8"
);
const appServerSource = readFileSync(
  join(moduleDir, "reference/app-server/codex-app-server-facade.ts"),
  "utf8"
);
const appServerProcessSource = readFileSync(
  join(moduleDir, "reference/app-server/process/codex-app-server-process.ts"),
  "utf8"
);
const appServerEventRouterSource = readFileSync(
  join(moduleDir, "reference/app-server/codex-app-server-event-router.ts"),
  "utf8"
);
const appServerHomeConfigSource = readFileSync(
  join(moduleDir, "reference/app-server/process/codex-provider-home-config.ts"),
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
assert.match(source, /environment: \{\s+CODEX_HOME: providerHome,/u);
assert.match(source, /CODEX_WORKSPACE_PATH: workspacePath/u);
assert.match(source, /defaultApprovalMode: "never"/u);
assert.match(source, /defaultSandboxMode: "danger-full-access"/u);
assert.match(appServerSource, /CODEX_DEFAULT_PROCESS_PROFILE_KEY/u);
assert.match(appServerSource, /environment: options\.environment \?\? \{\}/u);
assert.match(appServerSource, /"thread\/rollback"/u);
assert.match(appServerSource, /"thread\/read"/u);
assert.match(appServerSource, /includeTurns: true/u);
assert.match(appServerSource, /countThreadTurns\(response\.thread\)/u);
assert.match(appServerProcessSource, /"\.harness-ai"/u);
assert.match(appServerProcessSource, /"\.harness"/u);
assert.match(
  appServerProcessSource,
  /prepareProviderCodexHome\(processEnvironment\)/u
);
assert.match(
  appServerHomeConfigSource,
  /model_reasoning_summary = "detailed"/u
);
assert.doesNotMatch(
  appServerHomeConfigSource,
  /model_reasoning_summary = "none"/u
);
assert.doesNotMatch(appServerProcessSource, /"\.codeai-hub"/u);
assert.doesNotMatch(
  appServerSource,
  /baseInstructions: workflowProfile\.baseInstructions/u
);
assert.doesNotMatch(appServerSource, /config: workflowProfile\.threadConfig/u);
assert.match(appServerEventRouterSource, /asReasoningBlockArray/u);
assert.match(
  appServerEventRouterSource,
  /if \(isRecord\(entry\)\) \{\s+return asText\(entry\.text\);/u
);
assert.doesNotMatch(
  appServerEventRouterSource,
  /finalSummaryBlocks: asStringArray\(item\.summary\)/u
);
assert.doesNotMatch(
  appServerEventRouterSource,
  /finalContentBlocks: asStringArray\(item\.content\)/u
);

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
