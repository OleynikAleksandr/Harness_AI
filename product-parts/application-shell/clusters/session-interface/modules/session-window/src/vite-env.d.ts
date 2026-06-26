/// <reference types="vite/client" />

interface ProviderSystemSettings {
  apiKey?: string;
  baseUrl?: string;
  configPath?: string;
  defaultModel?: string;
  endpointTag?: string;
  model?: string;
}

type HarnessSettings =
  import("../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js").HarnessSettings;

interface ProviderVersionEntry {
  currentVersion: null | string;
  latestVersion: null | string;
  packageName: string;
}

interface ProviderVersionsSnapshot {
  checkedAt: string;
  claude: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  codex: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
  glmOpenCode?: { cli: ProviderVersionEntry; sdk: ProviderVersionEntry };
}

interface Window {
  harnessCore?: {
    createSession(request: unknown): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    getSettings(): Promise<HarnessSettings>;
    getLocalModels(): Promise<
      { models: string[]; ok: true } | { error: string; ok: false }
    >;
    getProviderSystemSettings(
      providerId: string
    ): Promise<ProviderSystemSettings>;
    getProviderVersions(): Promise<
      | { ok: true; versions: ProviderVersionsSnapshot }
      | { error: string; ok: false }
    >;
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
    resetWorkspaceSettings(): Promise<
      { ok: true; settings: HarnessSettings } | { error: string; ok: false }
    >;
    restartCore(): Promise<
      | {
          ok: true;
          providers: import("../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js").ProviderDescriptor[];
          settings: HarnessSettings;
        }
      | { error: string; ok: false }
    >;
    saveSettings(request: {
      settings: HarnessSettings;
    }): Promise<
      { ok: true; settings: HarnessSettings } | { error: string; ok: false }
    >;
    sendMessage(request: unknown): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    updateProviderVersion(request: {
      provider: "claude" | "codex";
      target: "cli" | "sdk";
    }): Promise<
      | { ok: true; versions: ProviderVersionsSnapshot }
      | { error: string; ok: false }
    >;
  };
  harnessRuntime?: {
    providerDispatchMode: "core-session-dispatch";
  };
}
