import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./session-request-handler-facade.ts", import.meta.url),
  "utf8"
);

assert.match(
  source,
  /sessionReasoningDisplayFacade\.projectProviderEvent\(event\)/u
);
assert.match(source, /role: message\.role/u);
assert.match(
  source,
  /\.\.\.\(message\.tag \? \{ tag: message\.tag \} : \{\}\)/u
);
assert.match(source, /from "\.\/session-live-tail-dedupe\.js"/u);
assert.doesNotMatch(source, /event\.tag === "thinking"/u);
assert.match(source, /buildProviderTurnOptions\(session\)/u);
assert.match(source, /readPromotedProviderSessionId\(event\)/u);
assert.match(source, /this\.runtimeBindings\.set\(sessionId, \{/u);
assert.match(source, /promotedProviderSessionId/u);
assert.match(source, /async refreshUsageLimits\(sessionId: string\)/u);
assert.match(
  source,
  /if \(!isRecord\(event\)\)[\s\S]+?this\.updateTelemetryWithProviderEvent\(sessionId, event\);[\s\S]+?if \(typeof event\.type !== "string"\)/u
);
