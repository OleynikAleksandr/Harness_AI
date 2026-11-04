# Core Process Bridge Module

## Responsibility

Start, stop, restart, health-check, or connect to the local Core Runtime
process used by the Electron host.

This module is Application Shell infrastructure only. It supervises the Core
process, forwards renderer IPC as Core RPC, and relays Core event-stream
messages to renderer windows. It must not import Core/provider implementation
modules or own Core truth.

## Public Facade

`CoreProcessBridgeFacade`

## Inputs

- Workspace/app startup context.
- Core process command or connection settings.
- Renderer session hydration requests.
- Core restart/stop requests from settings UI.

## Outputs

- Core Runtime connection status.
- Renderer-safe Core API endpoint metadata.
- Renderer-safe forwarding of Core RPC results and Core events. The IPC→RPC map
  includes `harness-ai:core:stop-turn` → `stop-turn`, so the renderer Stop button
  reaches the Core-owned turn cancellation, and
  `harness-ai:core:get-localization-runtime-payload` →
  `get-localization-runtime-payload`, so renderer localization receives the
  Core materialized browser bundles instead of falling back to English, and
  `harness-ai:core:list-provider-model-catalogs` →
  `list-provider-model-catalogs`, so the Settings model cards receive the live
  Claude/Codex/Kimi catalogs Core serves. It also
  forwards `harness-ai:core:translate-dynamic-text` →
  `translate-dynamic-text` for provider-returned text that must be translated by
  Core instead of the renderer, and `harness-ai:core:ensure-glossary-file` →
  `ensure-glossary-file`, so the Settings glossary "Open glossary file" action
  resolves the real Core-owned do-not-translate glossary file path (creating it
  with seeded terms on first use) instead of the renderer guessing a path. It
  also forwards `harness-ai:core:rebuild-localization` → `rebuild-localization`,
  so the Settings "Rebuild translations" action can force Core to retranslate
  every category ignoring the localization bundle cache, and
  `harness-ai:core:set-local-model-context` → `set-local-model-context`, so
  the Local Models per-model context control reaches the Core-owned LM Studio
  management reload. Codex/Grok rollback uses the same transport-only pattern:
  `harness-ai:core:rollback-session-turns` → `rollback-session-turns`, passing
  only the raw `sessionId`/`numTurns` intent to Core.
  Blocking provider interactions follow that boundary through
  `harness-ai:core:respond-provider-interaction` →
  `respond-provider-interaction`; the bridge forwards the typed decision and
  never interprets permission, question or plan semantics.
  Session naming follows the same transport-only contract:
  `harness-ai:core:rename-session` → `rename-session` and
  `harness-ai:core:regenerate-session-title` → `regenerate-session-title`.
- Project workflow forwarding is transport-only as well:
  `harness-ai:core:remove-workspace` maps to Core `remove-workspace`
  (remove a project from the app; payload `{workspaceId}`).
  `harness-ai:core:workflow-inspect`, `workflow-prepare-project`,
  `workflow-status`, `workflow-doctor`, `workflow-autopilot-get`,
  `workflow-autopilot-set`, `workflow-mode-choice-get` (the execution mode
  card of a workspace) and `workflow-mode-choose` (the user's click on the
  card) map one-to-one to the Core methods of the same names. Core events,
  `workflow:mode-choice` among them, reach every window on
  `harness-ai:core-event` unchanged. The project pickers `harness-ai:core:pick-project-folder` ("Open
  Project") and `harness-ai:core:pick-project-parent` ("Select Parent
  Folder") open a native directory dialog and return only
  `{canceled, path}`; Core inspects, installs and registers the project.
- The supervisor starts Core with `HARNESS_ELECTRON_NODE` (the Electron
  binary, used by Core with `ELECTRON_RUN_AS_NODE=1` to run Workflow Kit
  commands) and `HARNESS_WORKFLOW_KIT_BUNDLE`: `Resources/workflow-kit` of
  the packaged app (electron-builder `extraResources` from
  `dist/workflow-kit`), otherwise `dist/workflow-kit` of the repository.
  The `workflowKitBundle` supervisor option overrides the path.
- Real Core process restart through health and shutdown contracts. `stop()` first
  asks the core to shut down over HTTP, then force-terminates the process by pid
  (SIGTERM escalating to SIGKILL) when a hung core ignores the request, so
  `restart()` always respawns a fresh process that re-reads disk state.
- Full Electron app relaunch uses the bridge `stopCore()` path before
  `app.relaunch(...)`, so the new host cannot attach to an orphan Core process
  on the fixed port and must start a fresh runtime from the current package.
- Core restart IPC returns renderer-safe `{ ok: false, error }` responses when
  restart or post-restart hydration fails, instead of rejecting the IPC invoke
  and leaving the Settings surface without a settled result. The Core event
  stream is reconnected after a successful restart and after a failed restart
  attempt.

- Session profile RPC forwarding: `harness-ai:core:list-session-profiles`,
  `harness-ai:core:create-session-profile` and
  `harness-ai:core:open-session-profile-file` map to the Core
  `list-session-profiles`/`create-session-profile`/`open-session-profile-file`
  methods in `IPC_TO_RPC`.
- Profile Studio forwarding is also transport-only: target/profile list,
  inspector get, Draft+creator-session create, exact-hash approve and
  confirmed profile-delete IPC channels map one-to-one to their Core RPC
  methods. Core update events are relayed unchanged.

## Owned Paths

- `module.md`
- `src/**`
