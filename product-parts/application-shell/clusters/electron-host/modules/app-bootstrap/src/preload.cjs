"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("harnessRuntime", {
  providerDispatchMode: "core-session-dispatch",
});

contextBridge.exposeInMainWorld("harnessCore", {
  createSession: (request) =>
    ipcRenderer.invoke("harness-ai:core:create-session", request),
  getSettings: () => ipcRenderer.invoke("harness-ai:core:get-settings"),
  getLocalModels: () => ipcRenderer.invoke("harness-ai:core:get-local-models"),
  getProviderSystemSettings: (providerId) =>
    ipcRenderer.invoke(
      "harness-ai:core:get-provider-system-settings",
      providerId
    ),
  getProviderVersions: () =>
    ipcRenderer.invoke("harness-ai:core:get-provider-versions"),
  listProviders: () => ipcRenderer.invoke("harness-ai:core:list-providers"),
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
  restartCore: () => ipcRenderer.invoke("harness-ai:core:restart"),
  saveSettings: (request) =>
    ipcRenderer.invoke("harness-ai:core:save-settings", request),
  sendMessage: (request) =>
    ipcRenderer.invoke("harness-ai:core:send-message", request),
  updateProviderVersion: (request) =>
    ipcRenderer.invoke("harness-ai:core:update-provider-version", request),
});
