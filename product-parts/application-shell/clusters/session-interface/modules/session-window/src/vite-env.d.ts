/// <reference types="vite/client" />

interface ProviderSystemSettings {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  model?: string;
}

interface Window {
  harnessCore?: {
    createSession(request: unknown): Promise<
      | { ok: true; session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession }
      | { error: string; ok: false }
    >;
    getProviderSystemSettings(providerId: string): Promise<ProviderSystemSettings>;
    listProviders(): Promise<
      import("../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js").ProviderDescriptor[]
    >;
    onEvent(
      listener: (
        event: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js").SessionCoreEvent
      ) => void
    ): () => void;
    saveProviderSystemSettings(request: {
      providerId: string;
      settings: ProviderSystemSettings;
    }): Promise<
      | { ok: true; settings: ProviderSystemSettings }
      | { error: string; ok: false }
    >;
    sendMessage(request: unknown): Promise<
      | { ok: true; session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession }
      | { error: string; ok: false }
    >;
  };
  harnessRuntime?: {
    providerDispatchMode: "core-session-dispatch";
  };
}
