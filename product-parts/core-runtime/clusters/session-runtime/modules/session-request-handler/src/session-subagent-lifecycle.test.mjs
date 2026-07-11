import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./session-subagent-lifecycle.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("./session-provider-event-router.ts", import.meta.url),
  "utf8"
);
const bindingLifecycleSource = readFileSync(
  new URL("./session-provider-binding-lifecycle.ts", import.meta.url),
  "utf8"
);

assert.match(source, /event\.type === "subagent_control"/u);
assert.match(source, /event\.type === "subagent_session"/u);
assert.match(source, /handleStatusEvent/u);
assert.match(source, /sessionKind: "subagent"/u);
assert.match(source, /parentSessionId: parent\.id/u);
assert.match(source, /providerSessionId: inheritedSeed\.providerSessionId/u);
assert.match(
  source,
  /seed\.reasoningEffort \?\?\s+parent\.reasoningEffort \?\?\s+resolveConfiguredReasoningEffort\(parent\)/u
);
assert.match(source, /buildProviderTurnOptions\(session\)\.reasoningEffort/u);
assert.match(source, /subagentCallId/u);
assert.match(source, /titleOrigin: "auto"/u);
assert.match(source, /adoptProviderSession/u);
assert.match(source, /publishSubagentCall/u);
assert.match(source, /resolveCallStatus/u);
assert.match(source, /status === "interrupted"/u);
assert.match(source, /status === "not_found"/u);
assert.match(source, /status === "pending" \|\| status === "running"/u);
assert.doesNotMatch(source, /message\.text/u);
assert.doesNotMatch(source, /rollout/u);
assert.match(routerSource, /isProviderSubagentEvent\(event\)/u);
assert.match(
  routerSource,
  /context\.handleSubagentEvent\?\.\(sessionId, event\)/u
);
assert.match(bindingLifecycleSource, /adoptProviderSession\(/u);
assert.match(bindingLifecycleSource, /parentBinding\.adapter\.subscribe/u);
assert.match(
  bindingLifecycleSource,
  /handleSubagentEvent: this\.deps\.handleSubagentEvent/u
);
