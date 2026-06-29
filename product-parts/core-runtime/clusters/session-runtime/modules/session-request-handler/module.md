# Session Request Handler Module

## Responsibility

Own Core session actions: create, resume, send, stop, and delete. This module is the only Core Session Runtime entry point for Application Shell session actions.

## Public Facade

`SessionRequestHandlerFacade`

## Inputs

- Workspace id/path.
- Session id or provider selection.
- Raw user message payload.
- Optional next-session mode input, currently resolved by Core to the native raw baseline.
- Turn options from Core-owned settings/model binding.
- Core-owned provider settings used to derive applied turn options for all providers: model selection, Claude/Kimi/GLM thinking toggles, GLM reasoning effort, OpenRouter endpoint tag, and Codex reasoning effort/summary enablement. Codex effort is resolved through the settings-store Codex capability contract.
- Provider session id promotion events emitted by migrated provider runtimes, including Claude `sessionIdChanged` and reference-compatible `realSessionId` events.

## Outputs

- Core session events.
- Provider dispatch requests through the provider adapter contract.
- Session errors and lifecycle state.
- Provider-visible reasoning projected through `session-reasoning-display` into `thinking` dialog messages before UI snapshots.
- Assistant live chunks tagged `live` are kept in Core session state so final provider full-text messages can be suppressed or reduced to an unseen live tail before UI display.
- Provider bindings are promoted from temporary ids to real provider session ids in Core before later turns are dispatched, so resumed provider turns never depend on renderer state.
- Usage limits can be refreshed by Core when a session dialog is hydrated, so provider limit rows such as Kimi 5h/weekly recover even when the original binding-time read was unavailable. Reference-compatible provider telemetry payloads without a provider event `type` are still accepted for telemetry before typed event routing begins.
- Session mode metadata is stored on the Core session. The only active runtime behavior in this scope is `Native · Raw`; managed/normalized selections may be visualized by clients but are not applied to provider dispatch until a later Core contract enables them.
- The provider session id is persisted on the Core session record (`providerSessionId`) whenever a binding is published (`publishBinding`), covering both the initial bind and later promotions (e.g. Claude `realSessionId`). This keeps the persisted id equal to the id the provider uses in its artifact filename, so a removed session can locate and delete its provider-owned artifacts without parsing the event log, even after a core restart.
- Deleting a Core session calls the provider adapter's optional `deleteSessionArtifacts(providerSessionId, workspacePath)` hook after closing the live binding, using the live provider session id or the persisted `providerSessionId` fallback.
- `stopTurn(sessionId)` matches the reference Stop: it unsubscribes the binding, calls `adapter.closeSession(providerSessionId)` (which interrupts the in-flight turn — Claude `interrupt`, Kimi `cancel`), invalidates the runtime binding, and flips turn-state to idle. The persisted `providerSessionId` stays on the session.
- Turn dispatch is oneshot + resume: `sendMessage` rebinds when the runtime binding is missing (after a Stop or a Core restart), and `bindProviderSession` resumes by the persisted `providerSessionId` through `adapter.resumeSession` when one exists, otherwise creates a fresh provider session. So a stopped conversation continues from the prior turn on the next message.

## Owned Paths

- `module.md`
- `src/**`
