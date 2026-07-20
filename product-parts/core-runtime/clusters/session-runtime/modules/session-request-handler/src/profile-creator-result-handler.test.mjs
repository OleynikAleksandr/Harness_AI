import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const handlerSource = readFileSync(
  new URL("./profile-creator-result-handler.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("./session-provider-event-router.ts", import.meta.url),
  "utf8"
);
const claudeRouterSource = readFileSync(
  new URL(
    "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/messaging/claude-stream-event-router.ts",
    import.meta.url
  ),
  "utf8"
);

assert.match(claudeRouterSource, /this\.emitRawStructuredOutput\(/u);
assert.match(claudeRouterSource, /type: "structured_output"/u);
assert.match(claudeRouterSource, /output,/u);

assert.match(handlerSource, /class ProfileCreatorResultHandler/u);
assert.match(handlerSource, /sessionPurpose\?\.type !== "profile-creator"/u);
assert.match(handlerSource, /this\.agent\.parseTurnResult\(event\.output\)/u);
assert.match(handlerSource, /applyCreatorSnapshot\(\{/u);
assert.match(handlerSource, /role: "assistant"/u);
assert.match(handlerSource, /role: "system"/u);
assert.match(handlerSource, /draft unchanged/u);
assert.match(handlerSource, /buildProviderTurnOptions\(session\)/u);
assert.match(handlerSource, /repairPendingSessions/u);
assert.match(
  routerSource,
  /profileCreatorResultHandler\.handle\(context, sessionId, event\)/u
);

console.log("profile-creator-result-handler tests: OK");
