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
const bindingLifecycleSource = readFileSync(
  new URL("./session-provider-binding-lifecycle.ts", import.meta.url),
  "utf8"
);
const rollbackSource = readFileSync(
  new URL("./session-rollback.ts", import.meta.url),
  "utf8"
);
const titleServiceSource = readFileSync(
  new URL("./session-title-service.ts", import.meta.url),
  "utf8"
);

// The facade delegates provider binding and event routing to a bounded helper.
assert.match(source, /new SessionProviderBindingLifecycle/u);
assert.match(source, /new SessionSubagentLifecycle/u);
assert.match(
  bindingLifecycleSource,
  /routeProviderEvent\(this\.providerEventRouterContext\(\), sessionId, event\)/u
);
assert.match(source, /from "\.\/session-live-tail-dedupe\.js"/u);
assert.match(bindingLifecycleSource, /buildProviderTurnOptions\(session\)/u);
assert.match(source, /async refreshUsageLimits\(sessionId: string\)/u);
assert.match(source, /rollbackSessionTurns\(/u);
assert.match(source, /new SessionRollback/u);
assert.match(source, /getEvents: \(sessionId\)/u);
assert.match(source, /restoreTelemetry: \(sessionId, telemetry\)/u);
assert.match(source, /ReasoningTranslationOverlayFacade/u);
assert.match(source, /type: "session:message_translation"/u);
assert.match(source, /usageContextTelemetryFacade\.applyProviderEvent\(/u);
// Provider session starts are normalized through the additive contract.
assert.match(
  bindingLifecycleSource,
  /normalizeProviderSessionStart\(startOutcome\)/u
);

// The applied profile snapshot is captured at create via the resolver
// (Native fallback lives in session-profile-resolution.ts) and adapter
// details are recorded once.
assert.match(source, /appliedProfile: resolution\.appliedProfile/u);
const resolutionSource = readFileSync(
  new URL("./session-profile-resolution.ts", import.meta.url),
  "utf8"
);
assert.match(resolutionSource, /kind: "native"/u);
assert.match(resolutionSource, /never rereads profile files/u);
assert.match(source, /private recordAppliedProfileApplication\(/u);
assert.match(
  resolutionSource,
  /session\.appliedProfile\.appliedProfileApplication/u
);

const typesSource = readFileSync(
  new URL("./session-request-handler-types.ts", import.meta.url),
  "utf8"
);
assert.match(typesSource, /export interface AppliedProfileSnapshot/u);
assert.match(typesSource, /export interface RollbackCoreSessionRequest/u);
assert.match(typesSource, /preserveFirstUserTurns\?: number/u);
assert.match(typesSource, /appliedProfile\?: AppliedProfileSnapshot/u);
assert.match(typesSource, /sessionKind\?: CoreSessionKind/u);
assert.match(typesSource, /parentSessionId\?: string/u);
assert.match(typesSource, /subagentStatus\?: CoreSubagentStatus/u);
assert.match(typesSource, /titleOrigin\?: CoreSessionTitleOrigin/u);
assert.match(typesSource, /export interface RenameCoreSessionRequest/u);
assert.match(
  typesSource,
  /export interface RegenerateCoreSessionTitleRequest/u
);

const historySource = readFileSync(
  new URL("./session-history-store.ts", import.meta.url),
  "utf8"
);
const historyRestoreSource = readFileSync(
  new URL("./session-history-restore.ts", import.meta.url),
  "utf8"
);
const coreRuntimeApiSource = readFileSync(
  new URL(
    "../../../../runtime-process/modules/core-runtime-process/src/core-runtime-api.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(
  historySource,
  /isAppliedProfileSnapshot\(value\.appliedProfile\)/u
);
// Provider session id is persisted on both initial binding and promotion.
assert.match(source, /private rememberProviderSessionId\(/u);
assert.match(
  source,
  /binding\?\.providerSessionId \?\? session\.providerSessionId/u
);
assert.match(source, /closeAndCleanupProviderSession\(\{/u);
assert.doesNotMatch(source, /event\.tag === "thinking"/u);

const utilsSource = readFileSync(
  new URL("./session-request-handler-runtime-utils.ts", import.meta.url),
  "utf8"
);
assert.match(utilsSource, /deleteSessionArtifacts\?\.\(/u);

const adapterContractSource = readFileSync(
  new URL(
    "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts",
    import.meta.url
  ),
  "utf8"
);
assert.match(adapterContractSource, /rollbackSessionTurns\?\(/u);
assert.match(rollbackSource, /session\.providerId !== "codex"/u);
assert.match(rollbackSource, /Cannot rollback while a turn is running/u);
assert.match(rollbackSource, /resolveRollbackTurnCount/u);
assert.match(rollbackSource, /readAnchorTelemetrySnapshot/u);
assert.match(rollbackSource, /request\.preserveFirstUserTurns/u);
assert.match(rollbackSource, /type: "session:messages-replaced"/u);

// Managed resolution activates at create through the profile resolver and
// the adapter receives the snapshot-built payload.
assert.match(source, /this\.profileResolver\.resolveAppliedProfile\(/u);
assert.match(
  bindingLifecycleSource,
  /buildSessionProfilePayload\(session\.appliedProfile\)/u
);
assert.match(source, /async createSession\(/u);
assert.equal(source.split("\n").length <= 500, true);
assert.match(source, /sessionKind: "primary"/u);
assert.match(source, /titleOrigin: "default"/u);
assert.match(source, /sessionTitleService\.applyInitialAutoTitle/u);
assert.match(source, /renameSession\(request: RenameCoreSessionRequest\)/u);
assert.match(source, /regenerateSessionTitle\(/u);
assert.match(titleServiceSource, /titleOrigin: "manual"/u);
assert.match(titleServiceSource, /titleOrigin: "auto"/u);
assert.match(titleServiceSource, /session\.sessionKind === "subagent"/u);
assert.match(source, /collectSessionTreeIds\(sessionId\)\.reverse\(\)/u);
assert.match(source, /session\.parentSessionId === parentSessionId/u);
assert.match(bindingLifecycleSource, /adoptProviderSession\(/u);
assert.match(bindingLifecycleSource, /handleSubagentEvent/u);
assert.match(historySource, /normalizeCoreSession/u);
assert.match(
  historySource,
  /sessionKind: session\.sessionKind \?\? "primary"/u
);
assert.match(
  typesSource,
  /configureSessionHistory\?\(sessions: CoreSession\[\]\)/u
);
assert.match(
  historyRestoreSource,
  /configureSessionHistory\?\.\(restoredSessions\)[\s\S]+?for \(const session of restoredSessions\)/u
);
assert.doesNotMatch(
  coreRuntimeApiSource,
  /sessionEventStreamFacade\.configureSessionHistory/u
);

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
