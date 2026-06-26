const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("harnessRuntime", {
  providerDispatchMode: "core-session-dispatch"
});
