# App Bootstrap Module

## Responsibility

Own Electron lifecycle, window creation, and local application startup.

## Public Facade

`AppBootstrapFacade`

## Inputs

- App launch options.
- Core process bridge facade.

## Outputs

- Running Electron main window.
- Renderer preload/bootstrap state.
- Preload bridge methods for Core-owned localization runtime payloads,
  Core-owned dynamic text translation, resolving/creating the Core-owned
  do-not-translate glossary file (`ensureGlossaryFile`), and forcing a full
  Core retranslation ignoring the localization bundle cache
  (`rebuildLocalization`).
- Renderer-safe shell bridge method for full Electron app relaunch. The
  relaunch path first stops the supervised Core process through the Core Process
  Bridge, then schedules `app.relaunch(...)` and exits the current host so the
  next process reloads the packaged `app.asar` and starts a fresh Core runtime
  from disk.
- Detached session windows are unique per `(workspaceId, sessionId)`. The host
  stores the in-flight/created window promise so concurrent repeat clicks do
  not create duplicates; later clicks restore/show/focus the existing window.
  The registry entry is removed only when the BrowserWindow closes (or creation
  fails), not when the provider turn/subagent completes.

- `window.harnessCore` exposes `listSessionProfiles(request?)`,
  `createSessionProfile(request)` and `openSessionProfileFile(request)`
  (session profile picker/authoring surface), typed in the session window
  `vite-env.d.ts`.
- `window.harnessCore` also exposes `captureNativeRequest(request)` and
  `listCapturableModels()` for the Native Request Capture Settings card,
  bridged to the Core `capture-native-request` / `list-capturable-models`
  methods through the core-process bridge and typed in `vite-env.d.ts`, where
  a model's default reasoning effort is nullable when the provider exposes no
  reasoning selector.
- `window.harnessCore.rollbackSessionTurns({ sessionId, numTurns })` exposes
  only the raw Codex/Grok rollback intent to the renderer; Core owns provider
  validation, strategy and transcript refresh.
- `window.harnessCore.respondProviderInteraction({ sessionId, decision })`
  exposes only a typed user decision for a Core-published blocking provider
  interaction. Raw Grok reverse-request payloads and ACP response construction
  remain outside the preload surface.
- `window.harnessCore.renameSession({ sessionId, title })` and
  `regenerateSessionTitle({ sessionId })` expose only user intent; title
  derivation, validation, persistence and manual-lock truth remain in Core.

## Owned Paths

- `module.md`
- `src/**`
