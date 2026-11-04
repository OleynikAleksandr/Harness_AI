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
- `window.harnessCore` exposes typed Profile Studio target/list/get/create/
  approve/delete commands. `onProfileStudioUpdated()` receives only Studio
  update events, while ordinary `onEvent()` filters them out so the existing
  session surface continues to consume only its established Core event union.
- `window.harnessCore` also exposes `captureNativeRequest(request)` and
  `listCapturableModels()` for the Native Request Capture Settings card,
  bridged to the Core `capture-native-request` / `list-capturable-models`
  methods through the core-process bridge and typed in `vite-env.d.ts`, where
  a model's default reasoning effort is nullable when the provider exposes no
  reasoning selector.
- `window.harnessCore.listProviderModelCatalogs()` returns the Core-served
  Claude/Codex/Kimi Settings model rows (`ProviderModelCatalogs` from the
  settings-store facade, typed in `vite-env.d.ts`) through the
  `list-provider-model-catalogs` bridge method.
- `window.harnessCore.rollbackSessionTurns({ sessionId, numTurns })` exposes
  only the raw Codex/Grok rollback intent to the renderer; Core owns provider
  validation, strategy and transcript refresh.
- `window.harnessCore.respondProviderInteraction({ sessionId, decision })`
  exposes only a typed user decision for a Core-published blocking provider
  interaction. Raw Grok reverse-request payloads and ACP response construction
  remain outside the preload surface.
- `window.harnessCore` exposes the project workflow surface:
  `pickProjectFolder()` and `pickProjectParent()` (native directory pickers
  that return `{canceled, path}`), `inspectProjectFolder(request)`,
  `prepareProject(request)`, `getWorkflowStatus(request)`,
  `runProjectDoctor(request)`, `getWorkflowAutopilot(request)`,
  `setWorkflowAutopilot(request)`, `getWorkflowModeChoice({workspaceId})`
  (`workflow-mode-choice-get`), `chooseWorkflowMode({workspaceId,
  sessionId, generation, option})` (`workflow-mode-choose`) and
  `setGitIdentity({name, email})` (`workflow-identity-set`), bridged
  one-to-one to the Core `workflow-*` methods. Inspection, installation,
  status, autopilot, mode card and identity validation truth stay in Core
  and the Kit; the renderer sends only the clicked option or the typed
  name and email.
- `window.harnessCore.removeWorkspace(workspaceId)` sends only the user's
  intent to remove a project from the app (`remove-workspace
  {workspaceId}`); what is removed and which workspace becomes active is
  decided by Core.
- `window.harnessCore.renameSession({ sessionId, title })` and
  `regenerateSessionTitle({ sessionId })` expose only user intent; title
  derivation, validation, persistence and manual-lock truth remain in Core.

## Owned Paths

- `module.md`
- `src/**`
