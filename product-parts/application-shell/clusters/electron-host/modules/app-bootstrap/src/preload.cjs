"use strict";
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("harnessRuntime", {
  providerDispatchMode: "core-session-dispatch",
});

contextBridge.exposeInMainWorld("harnessFilePaths", {
  getPathForFile: (file) => webUtils.getPathForFile(file),
});

contextBridge.exposeInMainWorld("harnessCore", {
  createSession: (request) =>
    ipcRenderer.invoke("harness-ai:core:create-session", request),
  deleteSession: (sessionId) =>
    ipcRenderer.invoke("harness-ai:core:delete-session", sessionId),
  ensureGlossaryFile: () =>
    ipcRenderer.invoke("harness-ai:core:ensure-glossary-file"),
  listSessionProfiles: (request) =>
    ipcRenderer.invoke("harness-ai:core:list-session-profiles", request),
  createSessionProfile: (request) =>
    ipcRenderer.invoke("harness-ai:core:create-session-profile", request),
  openSessionProfileFile: (request) =>
    ipcRenderer.invoke("harness-ai:core:open-session-profile-file", request),
  getSessionEvents: (sessionId) =>
    ipcRenderer.invoke("harness-ai:core:get-session-events", sessionId),
  getSettings: (workspacePath) =>
    ipcRenderer.invoke("harness-ai:core:get-settings", workspacePath),
  getLocalizationRuntimePayload: () =>
    ipcRenderer.invoke("harness-ai:core:get-localization-runtime-payload"),
  getLocalModels: () => ipcRenderer.invoke("harness-ai:core:get-local-models"),
  getProviderSystemSettings: (providerId) =>
    ipcRenderer.invoke(
      "harness-ai:core:get-provider-system-settings",
      providerId
    ),
  getProviderVersions: () =>
    ipcRenderer.invoke("harness-ai:core:get-provider-versions"),
  listSessions: (workspaceId) =>
    ipcRenderer.invoke("harness-ai:core:list-sessions", workspaceId),
  listProviders: () => ipcRenderer.invoke("harness-ai:core:list-providers"),
  listWorkspaces: () => ipcRenderer.invoke("harness-ai:core:list-workspaces"),
  rebuildLocalization: () =>
    ipcRenderer.invoke("harness-ai:core:rebuild-localization"),
  onEvent: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("harness-ai:core-event", handler);
    return () => {
      ipcRenderer.removeListener("harness-ai:core-event", handler);
    };
  },
  saveProviderSystemSettings: (request) =>
    ipcRenderer.invoke(
      "harness-ai:core:save-provider-system-settings",
      request
    ),
  resetWorkspaceSettings: () =>
    ipcRenderer.invoke("harness-ai:core:reset-workspace-settings"),
  pickWorkspaceFolder: () =>
    ipcRenderer.invoke("harness-ai:core:pick-workspace-folder"),
  restartCore: () => ipcRenderer.invoke("harness-ai:core:restart"),
  saveSettings: (request) =>
    ipcRenderer.invoke("harness-ai:core:save-settings", request),
  selectWorkspace: (workspaceId) =>
    ipcRenderer.invoke("harness-ai:core:select-workspace", workspaceId),
  sendMessage: (request) =>
    ipcRenderer.invoke("harness-ai:core:send-message", request),
  stopTurn: (sessionId) =>
    ipcRenderer.invoke("harness-ai:core:stop-turn", sessionId),
  translateDynamicText: (request) =>
    ipcRenderer.invoke("harness-ai:core:translate-dynamic-text", request),
  updateProviderVersion: (request) =>
    ipcRenderer.invoke("harness-ai:core:update-provider-version", request),
});

contextBridge.exposeInMainWorld("harnessShell", {
  detachSession: (request) =>
    ipcRenderer.invoke("harness-ai:app:detach-session", request),
  restartApp: () => ipcRenderer.invoke("harness-ai:app:restart"),
});
