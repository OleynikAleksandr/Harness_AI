/// <reference types="vite/client" />

interface Window {
  harnessRuntime?: {
    providerDispatchMode: "core-session-dispatch";
  };
}
