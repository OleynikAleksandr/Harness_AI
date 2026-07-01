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
  Core materialized browser bundles instead of falling back to English. It also
  forwards `harness-ai:core:translate-dynamic-text` →
  `translate-dynamic-text` for provider-returned text that must be translated by
  Core instead of the renderer, and `harness-ai:core:ensure-glossary-file` →
  `ensure-glossary-file`, so the Settings glossary "Open glossary file" action
  resolves the real Core-owned do-not-translate glossary file path (creating it
  with seeded terms on first use) instead of the renderer guessing a path. It
  also forwards `harness-ai:core:rebuild-localization` → `rebuild-localization`,
  so the Settings "Rebuild translations" action can force Core to retranslate
  every category ignoring the localization bundle cache.
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

## Owned Paths

- `module.md`
- `src/**`
