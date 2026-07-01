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
type LocalizationRuntimePayload =
  import("../../../../../../core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.js").LocalizationRuntimePayload;

interface ProviderStatusEvent {
  payload: {
    providerId: string;
    readinessMessage?: string;
    readinessStatus: "checking" | "preparing" | "ready" | "failed";
    workspaceId: string;
  };
  timestamp: string;
  type: "provider:status";
}

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
    deleteSession(
      sessionId: string
    ): Promise<{ ok: true } | { error: string; ok: false }>;
    ensureGlossaryFile(): Promise<
      { error: string; ok: false } | { filePath: string; ok: true }
    >;
    getSessionEvents(
      sessionId: string
    ): Promise<
      import("../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js").SessionCoreEvent[]
    >;
    getSettings(workspacePath?: string): Promise<HarnessSettings>;
    getLocalizationRuntimePayload(): Promise<LocalizationRuntimePayload>;
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
    listSessions(
      workspaceId?: string
    ): Promise<
      import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession[]
    >;
    listWorkspaces(): Promise<{
      activeWorkspaceId: string;
      workspaces: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace[];
    }>;
    rebuildLocalization(): Promise<{ ok: true } | { error: string; ok: false }>;
    onEvent(
      listener: (
        event:
          | import("../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js").SessionCoreEvent
          | ProviderStatusEvent
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
    pickWorkspaceFolder(): Promise<
      | {
          ok: true;
          workspace: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace;
        }
      | { canceled?: boolean; error?: string; ok: false }
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
    selectWorkspace(workspaceId: string): Promise<
      | {
          ok: true;
          workspace: import("../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js").HarnessWorkspace;
        }
      | { error: string; ok: false }
    >;
    sendMessage(request: unknown): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    stopTurn(sessionId: string): Promise<
      | {
          ok: true;
          session: import("../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js").CoreSession;
        }
      | { error: string; ok: false }
    >;
    translateDynamicText(request: {
      category?: "generic" | "reasoning";
      text: string;
    }): Promise<
      | { ok: true; status: string; text: string }
      | { error: string; ok: false; text: string }
    >;
    updateProviderVersion(request: {
      provider: "claude" | "codex" | "glmOpenCode";
      target: "cli" | "sdk";
    }): Promise<
      | { ok: true; versions: ProviderVersionsSnapshot }
      | { error: string; ok: false }
    >;
  };
  harnessFilePaths?: {
    getPathForFile(file: File): string;
  };
  harnessRuntime?: {
    providerDispatchMode: "core-session-dispatch";
  };
  harnessShell?: {
    detachSession(request: {
      sessionId: string;
      workspaceId: string;
    }): Promise<{ ok: true } | { error: string; ok: false }>;
    restartApp(): Promise<{ ok: true } | { error: string; ok: false }>;
  };
}
