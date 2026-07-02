import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./session-request-handler-facade.ts", import.meta.url),
  "utf8"
);
const routerSource = readFileSync(
  new URL("./session-provider-event-router.ts", import.meta.url),
  "utf8"
);

// The facade delegates provider event routing to the dedicated router file.
assert.match(source, /from "\.\/session-provider-event-router\.js"/u);
assert.match(
  source,
  /routeProviderEvent\(this\.providerEventRouterContext\(\), sessionId, event\)/u
);
assert.match(source, /from "\.\/session-live-tail-dedupe\.js"/u);
assert.match(source, /buildProviderTurnOptions\(session\)/u);
assert.match(source, /async refreshUsageLimits\(sessionId: string\)/u);
assert.match(source, /ReasoningTranslationOverlayFacade/u);
assert.match(source, /type: "session:message_translation"/u);
assert.match(source, /usageContextTelemetryFacade\.applyProviderEvent\(/u);
// Provider session starts are normalized through the additive contract.
assert.match(source, /normalizeProviderSessionStart\(startOutcome\)/u);
// Provider session id is persisted on both initial binding and promotion.
assert.match(source, /private rememberProviderSessionId\(/u);
assert.match(
  source,
  /binding\?\.providerSessionId \?\? session\.providerSessionId/u
);
assert.match(source, /deleteSessionArtifacts\?\.\(/u);
assert.doesNotMatch(source, /event\.tag === "thinking"/u);

// The router owns reasoning projection, promotion, and turn-state routing.
assert.match(
  routerSource,
  /sessionReasoningDisplayFacade\.projectProviderEvent\(event\)/u
);
assert.match(
  routerSource,
  /reasoningTranslation\.publishDisplayMessages\(\{[\s\S]+?displayMessages/u
);
assert.match(routerSource, /readPromotedProviderSessionId\(event\)/u);
assert.match(routerSource, /promotedProviderSessionId/u);
assert.match(routerSource, /context\.setBinding\(sessionId, \{/u);
assert.match(
  routerSource,
  /if \(!isRecord\(event\)\)[\s\S]+?context\.updateTelemetry\(sessionId, event\)[\s\S]+?if \(typeof event\.type !== "string"\)/u
);
assert.doesNotMatch(routerSource, /event\.tag === "thinking"/u);
