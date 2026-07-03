# Core Runtime Process Module

## Responsibility

Runs the Core Runtime as an out-of-process local server.

This module owns the process entrypoint and process contracts used by the
Application Shell supervisor/client: health, status, shutdown, Core RPC, and
Core event streaming. Session, provider and settings truth stays inside this
Core process boundary. Provider CLI/version tooling and local-model discovery
also run here so the Application Shell remains UI/supervisor/client only.

## Public Facade

`CoreRuntimeProcessFacade`

## Inputs

- Core process host and port options.
- Shutdown request from the local supervisor/client.
- Core RPC envelope from the Application Shell client.
- Provider version/update requests and local-model discovery requests.

## Outputs

- Local HTTP process contract.
- Health/status payload with process identity.
- Graceful shutdown acknowledgement.
- Server-sent Core events and RPC results.
- In-memory provider readiness events (`provider:status`) derived from raw
  readiness changes for the active workspace; these are streamed to clients but
  not written to session history JSONL.
- Provider version snapshots, provider update results and local-model lists.
  CLI update targets run the provider's own self-update command (`claude update`,
  `codex update`, `opencode upgrade`) so the active install is updated wherever it
  lives; SDK targets use `npm install -g <pkg>@latest`. This avoids updating a
  stale `~/.npm-global` copy while a native installer (e.g. `~/.local/share/claude`)
  stays first on PATH.
- On `delete-session` RPC, orchestrates session removal: deletes the session's
  event log, deletes the Core-owned reasoning translation sidecar under
  `.harness/sessions/reasoning-translations/`, and asks the provider adapter to
  delete its own per-session artifact (e.g. the Codex rollout) so nothing
  outlives the session record.
- Localization runtime bootstrap payloads are materialized through Core RPC into
  the Harness home `Localization` directory, using Core settings category
  mapping and provider-owned translation engines so browser clients render
  Core-owned localization state instead of deriving it locally. The engine set
  passed to the provider translation facade is built from the saved OpenRouter
  connection and `uiTranslation`/`reasoningTranslation` profiles (via
  `createProviderTranslationEngines`), so a configured OpenRouter model is
  available whenever the UI Translation Engine setting selects it, alongside
  the always-available `google-gtx` engine.
- Dynamic renderer text that cannot be part of static source dictionaries, such
  as OpenRouter model descriptions returned by provider search, is translated by
  the `translate-dynamic-text` Core RPC. The RPC uses the saved Reasoning
  Translation Engine and the `reasoning` localization category language, keeping
  translation execution inside Core/provider-owned boundaries. Its engine set
  is also built through `createProviderTranslationEngines`, so a configured
  OpenRouter reasoning translation model resolves here too.
- The category mapping follows the settings controls that users see in General:
  `uiInterface` feeds `ui_labels`, `userGuidance` feeds `ui_helper_text`, and
  `systemFeedback` feeds `messages_for_the_user`.
- The `ensure-glossary-file` Core RPC creates the user-editable do-not-translate
  glossary file (seeded with default preserve terms) under
  `<Harness home>/Localization/glossary/do-not-translate-terms.txt` if it does
  not already exist, and returns its resolved path so a client can open it in
  an external editor. It returns `{ ok: true, filePath }` on success or
  `{ ok: false, error }` if the filesystem operation fails.
- The `rebuild-localization` Core RPC forces a full retranslation of every
  localization category for the active workspace's current settings,
  bypassing (but still refreshing) the localization bundle cache. This lets a
  client force fresh output after editing the do-not-translate glossary file
  directly, since glossary content is not part of the bundle cache key. It
  returns `{ ok: true }` on success or `{ ok: false, error }` if
  materialization throws.
- `CoreRuntimeApi` (`core-runtime-api.ts`) owns only RPC dispatch plus
  workspace/session/settings handling to stay under the 500-line implementation
  file cap. Provider adapter registration and provider readiness event
  publishing are a separate cohesive responsibility, split into
  `CoreProviderLifecycle` (`core-provider-lifecycle.ts`); the per-provider
  adapter instantiation switch itself is a plain function in
  `core-provider-adapter-registration.ts`. `CoreRuntimeApi` holds a
  `providerLifecycle` instance and delegates to it instead of registering
  adapters or handling readiness itself.

- Session profile RPCs (`core-session-profile-rpc.ts`, the
  `ensure-glossary-file` four-layer pattern): `list-session-profiles`
  (catalog read model + per-provider last-selection/AutoNormalizer memory;
  triggers first-access seeding), `create-session-profile` (templates,
  universal or individual), `open-session-profile-file` (document path for
  the external-editor action; Native has no files). All return
  `{ ok: true, ... } | { error, ok: false }`.

- Session profile change events: `CoreRuntimeApi.subscribe()` also subscribes
  the shared session profile store's `watchProfiles` (the same
  `sessionProfileStore` instance the profile RPCs use, exported from
  `core-session-profile-rpc.ts`) and forwards each debounced file-change
  notification as a `{ type: "session-profiles:updated" }` core event through
  the same SSE event stream as session and provider-status events, so the
  renderer profile surfaces can reload the catalog after the user edits
  profile files on disk.

- Native request capture RPCs (`core-native-capture-rpc.ts`):
  `capture-native-request` builds a dedicated adapter instance via
  `buildProviderAdapterInstance` (so an active session's registered adapter is
  never clobbered), best-effort bootstraps it (`ensureWorkspaceHome` +
  `initialize`), and drives it through the `provider-network-capture` cluster's
  `NativeCaptureOrchestrator` (record-only, vendor-default request), returning
  `{ ok, markdownPath, jsonlPath, error }`. The Claude command passes a raised
  `timeoutMs` (120s): its capture drives the provider binary interactively in
  a pty (boot the UI, type the probe, submit), which does not fit the 30s
  proxy default that suits the direct Codex/Kimi clients.
  `list-capturable-models` returns the per-provider capturable model catalog
  from `provider-descriptor`. Only Claude/Codex/Kimi are capture providers;
  other providers return `provider_not_supported`. The adapter builder is
  factored out of `core-provider-adapter-registration.ts` and reused by the
  shared registry wiring.

## Owned Paths

- `module.md`
- `src/**`
