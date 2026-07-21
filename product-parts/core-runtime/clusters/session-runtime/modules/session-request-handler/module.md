# Session Request Handler Module

## Responsibility

Own Core session actions: create, resume, send, stop, and delete. This module is the only Core Session Runtime entry point for Application Shell session actions.

## Public Facade

`SessionRequestHandlerFacade`

## Inputs

- Workspace id/path.
- Session id or provider selection.
- Profile Studio creator-session assembly request with a pre-minted session
  id and the complete `ProfileStudioAgentContext`; this is a separate Core
  command path, not a renderer-authored provider/settings request.
- Raw user message payload.
- Raw Core title intents: manual rename (`sessionId`, `title`) and automatic
  title regeneration (`sessionId`).
- Raw provider-neutral rollback intent (`sessionId`, `numTurns`) from Core
  RPC/UI; this is accepted only for Codex and Grok sessions and only while the
  session is idle.
- Optional next-session mode input, currently resolved by Core to the native raw baseline.
- Turn options from Core-owned settings/model binding.
- Core-owned provider settings used to derive applied turn options for the native-channel providers: model selection, Claude thinking toggles, and Codex reasoning effort/summary enablement (resolved through the settings-store Codex capability contract). Universal-client endpoints resolve their own settings per turn inside their adapters.
- Grok uses the same provider-neutral binding and immutable applied-profile
  snapshot. Core forwards the session model and either the session's explicit
  reasoning effort or the Core-owned `providers.grok.reasoningByModel` value
  on each turn; only the Grok adapter translates them to ACP
  `session/set_model`.
- Provider interaction requests are captured as Core-owned pending state and
  exposed through ephemeral session events. Core validates response envelopes,
  forwards one typed decision to the bound adapter and cancels pending requests
  after five minutes; timeout and replacement fail closed as cancellation.
- Codex dispatch carries the selected session model and its normalized
  per-model reasoning effort as provider-neutral turn options. The Codex
  adapter owns translation into app-server `turn/start.model` and
  `turn/start.effort`; provider-home defaults are fallback-only.
- OpenCode turn options are no longer built after the GLM migration removed the
  `providers.glmOpenCode` settings schema; old OpenCode sessions are not kept
  compatible during this development-only migration. The retired
  `glm-native`/`openrouter` turn-option branches left with the 2026-07-05
  legacy cleanup, and the ACP `kimi` turn-option branch left with the
  kimi-provider retirement (same day).
- Provider session id promotion events emitted by migrated provider runtimes, including Claude `sessionIdChanged` and reference-compatible `realSessionId` events.

## Outputs

- Core session events.
- Provider-neutral child-session metadata on `CoreSession`: optional
  `sessionKind`, `parentSessionId`, agent nickname/role, delegated task,
  reasoning effort, subagent status/call id and title origin. Fields remain
  optional for persisted sessions created before this contract; restore
  normalizes those records to `primary`/`default`, while new sessions receive
  explicit values.
- Optional `CoreSession.sessionPurpose` is independent from structural kind.
  The first supported purpose is `{ type: "profile-creator", profileId }`;
  session-index restore validates and preserves it while sessions created
  before the field remain valid. Creator sessions stay `sessionKind: primary`.
- `createProfileCreatorSession()` materializes the target-bound Profile Creator
  spec as an immutable managed profile on the provider/model selected in
  Studio. Claude/Codex use reasoning `high`; Kimi keeps provider-managed
  reasoning. Every target keeps an empty managed tool list/settings sources
  and the HARNESS_AI_HOME-aware `ProfileStudio/workspace`. That workspace index
  is restored independently from the registered user-workspace list.
- Every creator dispatch, including the first dispatch after process restart,
  bypasses ordinary workspace model selection and carries the Studio JSON
  Schema plus the persisted creator-session provider/model turn contract.
- Raw `structured_output` provider events are intercepted only for
  `profile-creator` sessions. Core validates them through
  `ProfileStudioAgentFacade`, publishes only `assistantResponse` into the
  ordinary dialog and sends complete snapshots through controlled atomic
  authoring. Invalid schema or authoring results leave files unchanged,
  publish a system repair notice and enqueue at most one automatic
  schema-bound repair turn; a second invalid repair stops instead of looping.
- Provider dispatch requests through the provider adapter contract.
- Session errors and lifecycle state.
- Provider-visible reasoning projected through `session-reasoning-display` into `thinking` dialog messages before UI snapshots.
- Visible reasoning messages are marked pending when the reasoning localization
  policy requires translation, then translated asynchronously through the
  reasoning translation overlay module after the source message has been
  published. The settings snapshot passed to that module includes the current
  OpenRouter connection and translation profile config, so a saved OpenRouter
  reasoning translation model is available whenever `reasoningEngineId`
  selects it.
- Successful reasoning translations are persisted as sidecar overlays and
  broadcast as `session:message_translation` patch events; source message `text`
  remains the canonical transcript.
- Assistant live chunks tagged `live` are kept in Core session state so final provider full-text messages can be suppressed or reduced to an unseen live tail before UI display.
- Completed provider messages with the same stable id, role, tag and source
  text are idempotent in Core. This prevents app-server history replay from
  duplicating a persisted child transcript on later restarts while preserving
  live-tail completion and genuinely changed content. The request handler
  filters replay against its restored message read model, and the underlying
  session event stream independently refuses the same exact fingerprint before
  listener delivery or JSONL append.
- Provider bindings are promoted from temporary ids to real provider session ids in Core before later turns are dispatched, so resumed provider turns never depend on renderer state.
- Usage limits can be refreshed by Core when a session dialog is hydrated, so provider limit rows such as Kimi 5h/weekly recover even when the original binding-time read was unavailable. Reference-compatible provider telemetry payloads without a provider event `type` are still accepted for telemetry before typed event routing begins.
- Session mode metadata is stored on the Core session. Native and resolved
  managed profile snapshots are both applied through provider bindings;
  request normalization remains outside the current runtime contract.
- The provider session id is persisted on the Core session record (`providerSessionId`) whenever a binding is published (`publishBinding`), covering both the initial bind and later promotions (e.g. Claude `realSessionId`). This keeps the persisted id equal to the id the provider uses in its artifact filename, so a removed session can locate and delete its provider-owned artifacts without parsing the event log, even after a core restart.
- Deleting a Core session calls the provider adapter's optional `deleteSessionArtifacts(providerSessionId, workspacePath)` hook after closing the live binding, using the live provider session id or the persisted `providerSessionId` fallback.
- `stopTurn(sessionId)` matches the reference Stop: it unsubscribes the binding, calls `adapter.closeSession(providerSessionId)` (which interrupts the in-flight turn — Claude `interrupt`, Kimi `cancel`), invalidates the runtime binding, and flips turn-state to idle. The persisted `providerSessionId` stays on the session. Because the unsubscribe races ahead of the provider's terminal subagent events (proven live on Kimi: swarm cards stayed `running` forever after Stop), the stop also settles every still-running/pending subagent child in the stopped session's tree as `interrupted` through the normal subagent lifecycle, so parent call snapshots recompute with the same monotonic rules as live events; already-finished children keep their statuses.
- Turn dispatch is oneshot + resume: `sendMessage` rebinds when the runtime binding is missing (after a Stop or a Core restart), and `bindProviderSession` resumes by the persisted `providerSessionId` through `adapter.resumeSession` when one exists, otherwise creates a fresh provider session. So a stopped conversation continues from the prior turn on the next message.
- `rollbackSessionTurns({ sessionId, numTurns })` is Core-owned for Codex and
  Grok: it validates the active session, rejects unsupported-provider/running
  sessions, resumes the provider binding when needed, calls the
  adapter's optional `rollbackSessionTurns`, prunes the Core-visible transcript
  from the Nth last user turn, restores token/cache telemetry to the snapshot
  immediately before the removed tail, and publishes
  `session:messages-replaced` plus idle telemetry. Native Codex implements this
  through app-server `thread/rollback`; Grok uses its native rewind extension in
  `conversation_only` mode so file changes remain untouched. The same facade accepts the manual anchor policy
  `preserveFirstUserTurns: 2`; Core derives `numTurns` from the event-stream
  transcript projection so UI buttons, todo-plan orchestration and future
  automation do not duplicate rollback-depth logic. Provider eligibility and
  the preserved-turn policy are also published in Core telemetry capabilities,
  so renderer code does not maintain a parallel Codex/Grok allowlist.

- Provider event routing lives in `session-provider-event-router.ts`
  (`routeProviderEvent` + `ProviderEventRouterContext`): telemetry
  application, provider session id promotion, reasoning display projection,
  structured subagent event interception, and turn-state transitions moved
  out of the facade to keep it under the 500-line cap; the facade supplies a
  thin callback context.
- Provider binding/start/resume/dispatch/event wiring lives in
  `session-provider-binding-lifecycle.ts`; this is a behavior-preserving split
  from the facade and is also the adoption point for already-running provider
  child threads.
- `session-subagent-lifecycle.ts` consumes only typed provider-neutral
  `subagent_control`/`subagent_session`/`subagent_status` events. It creates or
  enriches child `CoreSession` records, preserves recursive parent ids,
  inherits the parent model/reasoning effort when Codex does not repeat them on
  its spawn activity, and for a legacy parent without persisted effort resolves
  the same Core turn setting used for provider dispatch. It then requests
  adoption of the live child provider thread, updates child status, and
  publishes stable `CoreSubagentCall` snapshots (the lifecycle builds its
  `session:subagent-call` envelope itself; the facade only forwards it to the
  event stream).
  When a `subagent_session` event carries a provider-handed `result` text, the
  lifecycle defers that fallback to the end of the current provider event
  batch. If the child's live channel delivered any assistant content during
  its terminal drain (the Kimi child-wire path), that transcript wins and the
  synthetic result is skipped; a genuinely channel-less child still receives
  the fallback exactly once. Replays and repeated terminal events cannot
  duplicate it.
  Historical `subagent_session` metadata also recomputes its parent call after
  enriching the child, so a restored terminal thread cannot leave the timeline
  call in `running`.
  Spawn-tool completion is not treated as child completion: call status is
  derived from agent/thread states, so a successfully spawned running agent
  remains `running`.
- The facade now wires that lifecycle to the provider event router. A new child
  is remembered in the append-only event stream, added to the workspace index,
  initialized with Core telemetry, published through `session:created`, and
  adopted through the already-running parent adapter binding before subsequent
  child reasoning/messages arrive. Restore keeps child metadata and resumes its
  persisted provider thread through the normal binding path.
- Child subagent statuses are monotonic at the Core boundary: a terminal
  status (`completed`/`interrupted`/`failed`/`not_found`/`shutdown`) is never
  downgraded to `running`/`pending` by a status event, agent state or child
  merge whose timestamp is not strictly newer than the session record, so
  historical hydration replay cannot resurrect finished children; a rejected
  downgrade also keeps the record's `updatedAt` untouched.
- Deleting any session cascades through every recursive `parentSessionId`
  descendant, closes each live provider binding, removes provider artifacts and
  deletes every record from the Core session/maps/index, preventing visible
  orphan children. The same cascade deletes each session's persisted Core
  event JSONL (`SessionEventStreamLike.deleteSessionEvents`) and its reasoning
  translation overlay sidecar
  (`ReasoningTranslationOverlayFacade.deleteSessionOverlays`), so deleted
  subagent trees leave no orphan files under `.harness/sessions/events/` or
  `.harness/sessions/reasoning-translations/`.
- `session-title-service.ts` owns title normalization and mutation. The first
  substantive primary-session user message replaces the provider placeholder
  exactly once with a 72-character auto title. Manual rename normalizes and
  validates up to 100 characters, records `titleOrigin=manual`, and blocks
  later automatic replacement. Regenerate reuses the first Core user message
  and returns the session to `titleOrigin=auto`; child sessions keep their
  delegated-task/provider titles. Every mutation persists the session and
  emits `session:updated` for client refresh.
- Provider session starts flow through the additive adapter contract:
  `createSession`/`resumeSession` outcomes are normalized via
  `normalizeProviderSessionStart` before binding.

- The immutable applied profile snapshot (`AppliedProfileSnapshot` on
  `CoreSession.appliedProfile`) is captured exactly once at session create
  (Native default until managed resolution activates), persisted through the
  workspace session index (`session-history-store.ts` validates it on read),
  and enriched exactly once with the adapter's
  `appliedProfileApplication` details on the first bind. The snapshot includes
  the materialized prompt, tooling categories, content hash, and optional
  native request sidecars (`inputPrefix`, `requestTemplate`, `tools`) so
  native-bundle sessions resume with the same provider-facing payload.
  Resume rebuilds adapter input from the snapshot and never rereads
  `~/.harness-ai/Profiles/**`; sessions persisted before this feature have no
  snapshot and keep legacy no-payload behavior.
- Session restore helpers live in `session-history-restore.ts`; Codex rollback
  validation/pruning lives in `session-rollback.ts` so the facade stays under
  the 500-line module limit while keeping Core as the workflow authority.
  Restore configures and loads append-only event files before rebuilding
  `messagesBySession`; provider replay therefore sees persisted stable message
  ids and remains idempotent across process restarts.

- Managed profile resolution is active at create: `next-session-mode.ts`
  resolves a managed selection only with a concrete profile id (requestMode
  stays `raw` until the normalizer exists), `session-profile-resolution.ts`
  (`SessionProfileResolver`) resolves it through `profile-catalog` +
  `profile-materializer` into the frozen snapshot using the immutable model
  requested for that new session. A Studio profile therefore resolves only
  for its exact provider/model target; a broken or incompatible selection
  rejects `createSession` with a structured error (no silent fallback), and
  `buildSessionProfilePayload` rebuilds the adapter payload strictly from
  the snapshot for both create and resume. `createSession` is async because
  resolution reads profile documents from disk. The applied profile reaches
  the UI read model as `CoreSession.appliedProfile` in session RPC payloads.

## Owned Paths

- `module.md`
- `src/**`
