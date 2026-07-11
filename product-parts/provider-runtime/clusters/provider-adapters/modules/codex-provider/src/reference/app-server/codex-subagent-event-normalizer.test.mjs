import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const normalizerSource = readFileSync(
  join(moduleDir, "codex-subagent-event-normalizer.ts"),
  "utf8"
);
const routerSource = readFileSync(
  join(moduleDir, "codex-app-server-event-router.ts"),
  "utf8"
);
const contractSource = readFileSync(
  join(
    moduleDir,
    "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.ts"
  ),
  "utf8"
);

for (const notification of [
  "item/started",
  "item/completed",
  "thread/started",
  "thread/status/changed",
]) {
  assert.equal(normalizerSource.includes(notification), true, notification);
}

assert.match(normalizerSource, /collabAgentToolCall/u);
assert.match(normalizerSource, /receiverThreadIds/u);
assert.match(normalizerSource, /agentsStates/u);
assert.match(normalizerSource, /agentNickname/u);
assert.match(normalizerSource, /agentRole/u);
assert.match(normalizerSource, /parentThreadId/u);
assert.match(
  normalizerSource,
  /childState\.workspacePath = parentState\.workspacePath/u
);
assert.match(normalizerSource, /errored: "failed"/u);
assert.match(normalizerSource, /notFound: "not_found"/u);
assert.match(
  routerSource,
  /routeCodexSubagentNotification\(this\.deps, method, params\)/u
);
assert.match(contractSource, /export type ProviderSubagentEvent/u);
assert.match(contractSource, /type: "subagent_control"/u);
assert.match(contractSource, /type: "subagent_session"/u);
assert.match(contractSource, /type: "subagent_status"/u);
