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

- `window.harnessCore` exposes `listSessionProfiles(request?)`,
  `createSessionProfile(request)` and `openSessionProfileFile(request)`
  (session profile picker/authoring surface), typed in the session window
  `vite-env.d.ts`.
- `window.harnessCore` also exposes `captureNativeRequest(request)` and
  `listCapturableModels()` for the Native Request Capture Settings card,
  bridged to the Core `capture-native-request` / `list-capturable-models`
  methods through the core-process bridge and typed in `vite-env.d.ts`.
- `window.harnessCore.rollbackSessionTurns({ sessionId, numTurns })` exposes
  only the raw Codex rollback intent to the renderer; Core owns provider
  validation, strategy and transcript refresh.

## Owned Paths

- `module.md`
- `src/**`
