const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("harnessProviders", {
  runTurn: (request) => ipcRenderer.invoke("harness-ai:provider-turn", request)
});
