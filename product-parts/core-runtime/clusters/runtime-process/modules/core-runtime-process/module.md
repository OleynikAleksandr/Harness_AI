# Core Runtime Process Module

## Responsibility

Runs the Core Runtime as an out-of-process local server.

This module owns the process entrypoint and process contracts used by the
Application Shell supervisor/client: health, status, shutdown, Core RPC, and
Core event streaming. Session, provider and settings truth stays inside this
Core process boundary. Provider CLI/version tooling and local-model discovery
also run here so the Application Shell remains UI/supervisor/client only.

Core composition registers the native Grok adapter beside Claude and Codex.
It resolves Grok's selected model and model-specific reasoning from the
Core-owned settings snapshot and supplies them to the adapter at registration;
the adapter still validates/applies them through authenticated ACP. The shared
liveness preflight initializes the Grok facade and therefore verifies both the
official CLI and its cached subscription login before Core publishes ready
state.

## Public Facade

`CoreRuntimeProcessFacade`

## Inputs

- Core process host and port options.
- Shutdown request from the local supervisor/client.
- Core RPC envelope from the Application Shell client.
- Provider version/update requests and local-model discovery requests.
- Raw Profile Studio list/get/create/approve/delete intents from the
  transport-only Application Shell bridge.

## Outputs

- Local HTTP process contract.
- Health/status payload with process identity.
- Graceful shutdown acknowledgement.
- Server-sent Core events and RPC results.
- Typed Profile Studio RPC composition lives in
  `core-profile-studio-rpc.ts`: target/profile/inspector reads use Core
  facades. Create first preflights the settings-selected composite Creator
  Agent profile, reuses the native-capture entry for a fresh target Capture,
  validates its raw provenance, then couples one Draft with one pre-minted
  persistent Codex creator session and dispatches exactly one Core-rendered
  first user message. Target provider/model remain authoring context rather
  than creator execution identity. Approve forwards the exact content hash while blocking Kimi
  until its capability ceiling is satisfied. Delete accepts one profile id,
  delegates validated Studio document removal to lifecycle/authoring, then
  passes the returned creator-session id through the existing Session Runtime
  cleanup cascade; an already-absent bound session is idempotent. Profile-file
  changes publish a separate `profile-studio:updated` event; Runtime Process
  does not derive UI state from documents.
- `respond-provider-interaction` forwards a validated user decision to Core's
  pending-interaction lifecycle; Runtime Process never constructs native
  provider or ACP response payloads.
- In-memory provider readiness events (`provider:status`) derived from raw
  readiness changes for the active workspace; these are streamed to clients but
  not written to session history JSONL.
- Provider version snapshots, provider update results and local-model lists.
  The `get-local-models` RPC returns `{models: string[] (legacy ids),
  entries: LocalModelEntry[]}` through the `local-models-client-provider`
  management channel (`listLocalModelEntries`), so the catalog comes from the
  CONFIGURED base URL (Core settings + env fallbacks) with per-model
  max/loaded context and tool capability. The `set-local-model-context` RPC
  validates `{model, contextLength}` (non-negative integer; 0 clears the
  wish), persists `providers.localModels.contextLengthByModel` through the
  settings store, applies the wish immediately via `applyLocalModelContext`
  (LM Studio reload semantics) and returns the refreshed entries. When the
  reload does not complete (server down, old LM Studio, load failure), the
  RPC returns a CONTROLLED error with the refreshed entries — the wish stays
  persisted and re-applies on the next session start; the renderer surfaces
  the message and still swaps in the returned catalog.
  `update-provider-version` and the auto-update toggles share one route,
  `updateProviderTarget(provider, target)`: CLI targets run the provider's
  own self-update command (`claude update`, `codex update`, Kimi's native
  `kimi upgrade`) so the active install is updated wherever it lives, and the
  Codex CLI target then re-reads the Codex catalog with
  `refreshCodexModelCatalog({ force: true })` (`model/list` comes from the
  installed CLI — Codex has no Harness copy, sessions spawn the global
  `codex`). Claude works the same way (2026-11-03): its sessions and live
  model catalog run on the one global npm Claude Agent SDK (`npm prefix -g`),
  so the Claude SDK target updates that single install (`updateClaudeSdk`,
  `npm install -g ... --force`) and then re-reads the Claude catalog with
  `refreshClaudeModelCatalog({ force: true })`; a failing install still runs
  the refresh and the failure is reported afterwards. Other SDK targets use
  `npm install -g <pkg>@latest`. The Claude SDK version row reports that
  global install (`readClaudeSdkVersion`, latest from the npm registry).
  `core-claude-sdk-updates.ts` owns that policy: `updateClaudeSdkInstall`,
  `isInstallOutdated` (a published version differs from an existing install;
  missing installs are never installed) and `autoUpdateProviderInstalls`.
  `CoreRuntimeApi.initialize()` calls `startProviderAutoUpdates()` after the
  catalog refreshes: for Claude and Codex with
  `providers.<id>.autoUpdate.enabled`, every outdated CLI/SDK install (Claude
  CLI, global Claude SDK, Codex CLI, global Codex SDK) is updated one after
  another in the background; a failed target keeps its version and the next start retries. The Kimi toggle still has no
  runtime consumer. This avoids updating a stale
  `~/.npm-global` copy while a native installer (e.g. `~/.local/share/claude`)
  stays first on PATH. OpenCode version/update handling is removed with the
  embedded runtime migration.
  The `get-provider-versions` snapshot also carries `kimi: { cli }` (CLI row
  only — Kimi has no SDK and no npm package) sourced from the Kimi
  native-capture facade version tooling: current version from the installed
  standalone binary, latest from the CLI's own update-state file. The
  `update-provider-version` CLI target for `kimi` runs the native
  `kimi upgrade` through the same facade; the SDK target stays rejected by
  package resolution.
- The `delete-session` RPC forwards the raw intent to Session Runtime and
  performs no cleanup of its own: the request-handler delete cascade closes
  bindings and removes provider artifacts, per-session event JSONL and
  reasoning translation sidecars for every session in the deleted tree
  (parent and all descendants), so nothing outlives the session records.
- The `rollback-session-turns` RPC forwards the raw provider-neutral Codex/Grok
  rollback intent (`sessionId`, `numTurns`) to Session Runtime. Runtime Process
  does not inspect provider history, derive turn counts, or choose rollback
  strategy.
- `rename-session` and `regenerate-session-title` forward raw title intents to
  Session Runtime. Core Session Runtime validates, persists and publishes the
  updated title; Runtime Process does not derive titles or maintain a shadow
  session name.
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
- Startup delegates session-index and event-file hydration as one ordered
  Session Runtime operation. Runtime Process no longer loads the event stream
  afterward, which previously left `messagesBySession` empty while restored
  provider subscriptions replayed history.
- `PROVIDER_IDS` includes the universal-client endpoints `kimi-client`,
  `glm-client`, `local-models-client` and `openrouter-client`:
  their adapters register at startup and RPC provider-id validation accepts
  them. Kimi resolves the immutable Core session model from per-turn options
  (an id of the served Kimi catalog); `CoreRuntimeApi.initialize()` first
  calls `refreshKimiModelCatalog()` (kimi-client-provider facade),
  `refreshCodexModelCatalog()` (codex-provider facade) and
  `refreshClaudeModelCatalog()` (claude-provider facade) so each persisted
  live model catalog applies synchronously before settings and adapters
  read it and the live refreshes finish in the background. The
  `list-provider-model-catalogs` RPC awaits the same three refreshes
  (`Promise.allSettled`, memoized for their 15-minute TTL, a failed read
  keeps the served catalog) and returns
  `settingsStoreFacade.listProviderModelCatalogs()` —
  `{claude, codex, kimiClient}` Settings model rows with per-model efforts
  and defaults; GLM resolves its selected model and reasoning
  effort from Core settings per turn while the adapter pins only the GLM
  dialect; Local Models resolves its selected model and server connection
  (base URL + optional key) from Core settings per turn while the adapter pins
  only the local dialect; OpenRouter resolves its selected model, base URL and
  endpoint tag from the shared `openRouter` settings section per turn while
  the adapter pins only the OpenRouter dialect.
  The retired legacy `glm-native`/`openrouter`/`local-models` adapters left
  `PROVIDER_IDS` and `buildProviderAdapterInstance` with the 2026-07-05
  legacy cleanup, and the ACP `kimi` adapter left with the kimi-provider
  retirement (same day, user order) — only the native-channel `claude`/`codex`
  and the client four register now.
- LM Studio autostart (`core-local-server-autostart.ts`, unconditional per
  the 2026-07-05 user order): `startLivenessPreflight` fires
  `ensureLocalModelsServer()` — ping the CONFIGURED base URL
  (`{v1}/models`, short timeout); when silent, launch the LM Studio service
  via the bundled `~/.lmstudio/bin/lms server start` (PATH `lms` next, the
  macOS background app launch `open -g -a "LM Studio"` as the last resort),
  poll readiness briefly and re-run the `local-models-client` liveness so
  the picker sees the models. Machines without LM Studio skip silently (an
  idle LM Studio holds no models in memory); the routine never throws.
  `glm-opencode` is no longer registered or
  started by Core runtime lifecycle; old OpenCode sessions are not preserved
  across updates during this development migration.

- Session profile RPCs (`core-session-profile-rpc.ts`, the
  `ensure-glossary-file` four-layer pattern): `list-session-profiles`
  (exact provider/model catalog read model + per-provider
  last-selection/AutoNormalizer memory; listing never creates profiles),
  `create-session-profile` (templates,
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
  never clobbered), validates the requested model and optional explicit
  `reasoningEffort` against the Core-returned provider descriptor, best-effort
  bootstraps it (`ensureWorkspaceHome` +
  `initialize`), and drives it through the `provider-network-capture` cluster's
  `NativeCaptureOrchestrator` (record-only request), passing the optional
  `profileId` through for profile-qualified providers and
  returning `{ ok, markdownPath, jsonlPath, error }`. For Codex app-server,
  Core prefers the explicit command effort; legacy callers without one fall
  back to the selected model's stored provider setting when supported, then to
  the descriptor default. Unknown models return `model_not_supported` and
  unsupported effort/model pairs return `reasoning_not_supported` rather than
  silently downgrading. The resolved effort is passed into the provider-neutral
  orchestrator command, so the adapter context, diagnostic `capture_start`,
  and reasoning-qualified artifact filenames share the exact same Core intent.
  The Claude command passes a raised
  `timeoutMs` (120s): its capture drives the provider binary interactively in
  a pty (boot the UI, type the probe, submit), which does not fit the 30s
  proxy default that suits the direct Codex client.
  `list-capturable-models` returns the per-provider capturable model catalog,
  model-specific reasoning options, labels, and optional default effort from
  `provider-descriptor`. Claude, Codex app-server and the diagnostic Kimi CLI
  channel are capture providers. Kimi routes directly to
  `kimi-native-capture` and never enters `PROVIDER_IDS` or
  `buildProviderAdapterInstance`; other providers return
  `provider_not_supported`.
  The same typed function is reused in-process by Profile Studio bootstrap;
  renderer code never starts a second capture workflow or locates artifacts.
  Its Codex list is the served live Codex catalog (app-server `model/list`
  visible models, GPT-6.1-Sol first).
  Its Kimi list is the served Kimi catalog (live Coding Plan models) with
  no reasoning selector; an explicit Kimi reasoning value is rejected rather
  than silently downgraded.
  The adapter builder is factored out of
  `core-provider-adapter-registration.ts` and reused by the shared registry
  wiring.

- Project workflow RPCs (`core-project-workflow-rpc.ts`,
  `CoreProjectWorkflowRpc`): `CoreRuntimeApi.invoke` routes every method
  that `CoreProjectWorkflowRpc.handles()` accepts before its own switch.
  Workflow Kit commands run through `workflowHostFacade` (module
  `workflow-host`) as child processes; results keep the Kit envelope
  `{ok: true, command, result} | {ok: false, code, message, nextAction,
  details}`:
  - `workflow-inspect {path}` — folder classification (absolute path);
  - `workflow-prepare-project {mode, path, name?}` — `new`: `path` is the
    parent folder and `name` the new folder (one segment); the target must
    be `MISSING` or `EMPTY` (`PROJECT_EXISTS`). `open`: `path` is the
    folder; a missing one is `FOLDER_MISSING`. Workflow Pilot or a folder
    inside another repository is `UNSUPPORTED_FOLDER`. Inspect actions
    `create`, `install` and `install-migrate` install, `update` updates,
    `open` and `doctor` install nothing. With `mode: "open"` and
    `install: false` ("Open Without Kit") nothing is installed and any
    existing folder is registered, as before the Kit. Then the existing
    `add-workspace`
    route registers and selects the folder, the host runtime file is
    written and the status is published. Every install or update passes
    `host: "harness"` (`install --host harness`), so new and installed or
    updated projects carry the Harness marker and the Kit requires the
    mode choice (`scope:propose`); an existing marker is kept. Result
    `{ok: true, inspect, install, status, workspace}`; a failed install
    registers nothing;
  - `workflow-status {workspaceId?}` — Kit status of the workspace (the
    active one by default; `UNKNOWN_WORKSPACE`), refreshing the runtime
    file;
  - `workflow-doctor {workspaceId?, fix?}` — the project doctor, then the
    status.
  - `workflow-autopilot-get {sessionId}` and `workflow-autopilot-set
    {sessionId, enabled}` — the per-session Core autopilot
    (`sessionWorkflowAutopilot` of `session-request-handler`, injectable as
    the `autopilot` dependency); result `{ok: true, autopilot: {sessionId,
    available, enabled, continues, maxContinues, running, lastDecision}}`. Turning it
    on for an idle session may start the first task at once.
  - the execution mode card (`core-workflow-mode-choice.ts`,
    `CoreWorkflowModeChoice`, spec 4.2 of `WorkflowKitExecutionModes.md`;
    the `sessions` dependency is `{get, send, subscribe}` over the session
    request handler and the session event stream):
    - when a primary session (with a workspace, not a subagent or Profile
      Creator) publishes `session:turn-state` `idle` and its workspace has
      a project Kit bundle, Core runs `scope:proposal`
      (`workflowHostFacade.proposal`). An open proposal (`host:
      "harness"`, not `refining`, with a scope id) of a new generation
      becomes the card of that workspace, owned by that session; another
      session of the workspace keeps the owner. No open proposal removes
      the card (`card: null`);
    - the card `{workspaceId, sessionId, generation, scopeId, title
      (objective), options [{id, recommended}] (recommended first),
      reason, state: offered|saving|chosen|dismissed, chosen, error}`.
      `orchestrated` is offered only when the owner session's provider is
      `claude`; when the recommended mode is not offered, no row is
      recommended and `reason` is `null`;
    - `workflow-mode-choice-get {workspaceId}` → `{ok: true, card |
      null}`;
    - `workflow-mode-choose {workspaceId, sessionId, generation, option}`
      — only the owner session of an `offered` card with an offered option
      (`MODE_CHOICE_UNAVAILABLE`, `INVALID_REQUEST`): the card turns
      `saving`, Core runs `scope:choose --generation --option --session
      <owner> --note "the user chose in the Harness mode card: ..."`. A Kit
      refusal (e.g. `PROPOSAL_CHANGED`) is returned and the card is
      `offered` again with `error`. On success the card is `chosen` and
      Core sends the owner session a user message through the
      user-message route (`sessionRequestHandlerFacade.sendMessage`, the
      route the autopilot continue turn follows): `sequential` — execute
      the plan task by task starting with the first task; `orchestrated` —
      act as orchestrator and hand tasks out with `assignment:next` /
      `assignment:create` to Claude subagents with isolation worktree;
      `refine` — refine the specification with the user, then propose
      again. Agent-facing texts are English, like the autopilot's. Result
      `{ok: true, card, choice}`;
    - `CoreRuntimeApi` `send-message` (a message the user typed) calls
      `userMessage(sessionId)` first: an `offered` card of that session
      becomes `dismissed`; the proposal stays without a choice and a later
      turn end of the same generation keeps it dismissed.
  Every workspace operation publishes `{type: "workflow:status",
  workspaceId, path, status}`; every autopilot change and decision is
  relayed as `{type: "workflow:autopilot", ...snapshot}`; every card change
  as `{type: "workflow:mode-choice", workspaceId, sessionId, card}`.
  `CoreRuntimeApi.subscribe()` relays them on the same event stream.
- `CoreWorkspaceRpc` (`core-workspace-rpc.ts`) owns the workspace registry
  routes, which `CoreRuntimeApi` delegates (`CoreWorkspaceRpc.handles`):
  - `list-workspaces` → `{activeWorkspaceId, builtInWorkspaceId,
    workspaces}`; `builtInWorkspaceId` is the always-present workspace that
    cannot be removed;
  - `add-workspace <path>` and `select-workspace <id>` — register/select,
    persist the registry snapshot (`<HARNESS_AI_HOME or ~/.harness-ai>/
    workspaces.json`), re-register provider adapters and provision the
    workspace;
  - `remove-workspace {workspaceId}` — removes the project from the app, not
    from disk: the registry entry (persisted), its sessions loaded in Core
    (`releaseWorkspaceSessions`: provider sessions closed, records dropped,
    history files kept) and the app-level provider home residue
    (`removeWorkspaceResidue`). Removing the active project activates the
    built-in workspace. Result `{ok: true, activeWorkspaceId,
    builtInWorkspaceId, workspaces}` or `{ok: false, code, error}` with
    `BUILT_IN_WORKSPACE` / `UNKNOWN_WORKSPACE`.
  `restore()` loads the snapshot at Core start; `CoreProjectWorkflowRpc`
  registers prepared projects through `add`.

## Owned Paths

- `module.md`
- `src/**`
