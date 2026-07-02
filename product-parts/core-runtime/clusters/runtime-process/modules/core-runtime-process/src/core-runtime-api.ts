import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { providerWorkspaceProvisionerFacade } from "../../../../../../provider-runtime/clusters/provider-readiness/modules/provider-workspace-provisioner/src/provider-workspace-provisioner-facade.js";
import {
  type ProviderId,
  providerRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { sessionEventStreamFacade } from "../../../../session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import {
  type CoreSession,
  sessionRequestHandlerFacade,
} from "../../../../session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import { ReasoningTranslationOverlayStore } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-store.js";
import {
  type HarnessSettings,
  settingsStoreFacade,
} from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import {
  type WorkspaceRegistrySnapshot,
  workspaceRegistryFacade,
} from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { translateDynamicCoreText } from "./core-dynamic-translation.js";
import { ensureCoreGlossaryFileRpcResult } from "./core-glossary-rpc.js";
import { rebuildCoreLocalizationRpcResult } from "./core-localization-rebuild-rpc.js";
import { materializeCoreLocalizationRuntimePayload } from "./core-localization-runtime.js";
import {
  captureNativeRequestRpcResult,
  listCapturableModelsRpcResult,
} from "./core-native-capture-rpc.js";
import {
  type CoreEventListener,
  CoreProviderLifecycle,
  PROVIDER_IDS,
} from "./core-provider-lifecycle.js";
import {
  installLatestGlobalPackage,
  loadLocalModels,
  loadProviderVersions,
  resolveProviderPackage,
  updateProviderCli,
} from "./core-provider-tools.js";
import {
  createSessionProfileRpcResult,
  listSessionProfilesRpcResult,
  openSessionProfileFileRpcResult,
  SESSION_PROFILES_UPDATED_EVENT_TYPE,
  sessionProfileStore,
} from "./core-session-profile-rpc.js";

const WORKSPACE_REGISTRY_FILE = join(
  process.env.HARNESS_AI_HOME || join(homedir(), ".harness-ai"),
  "workspaces.json"
);

export class CoreRuntimeApi {
  private initialized = false;
  private readonly providerLifecycle = new CoreProviderLifecycle();
  private readonly reasoningOverlayStore =
    new ReasoningTranslationOverlayStore();

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.restoreState();
    this.providerLifecycle.registerAdapters();
    this.providerLifecycle.subscribeReadiness();
    this.providerLifecycle.startLivenessPreflight();
    this.startWorkspaceProvisioning();
    sessionRequestHandlerFacade.resumeRestoredSessions();
    this.initialized = true;
  }

  subscribe(listener: CoreEventListener): () => void {
    const unsubscribeSession = sessionEventStreamFacade.subscribe(listener);
    const unsubscribeProviderStatus =
      this.providerLifecycle.addStatusListener(listener);
    const unsubscribeProfiles = sessionProfileStore.watchProfiles(() => {
      listener({ type: SESSION_PROFILES_UPDATED_EVENT_TYPE });
    });
    return () => {
      unsubscribeSession();
      unsubscribeProviderStatus();
      unsubscribeProfiles();
    };
  }

  invoke(method: string, payload: unknown): unknown {
    this.initialize();
    switch (method) {
      case "list-workspaces":
        return {
          activeWorkspaceId: workspaceRegistryFacade.getActiveWorkspace().id,
          workspaces: workspaceRegistryFacade.getKnownWorkspaces(),
        };
      case "add-workspace":
        return this.addWorkspace(readString(payload));
      case "select-workspace":
        return this.selectWorkspace(readString(payload));
      case "list-sessions":
        return sessionRequestHandlerFacade.listSessions(readString(payload));
      case "get-session-events":
        return this.getSessionEvents(readString(payload));
      case "list-providers":
        return providerRegistryFacade.listProviders();
      case "create-session":
        return sessionRequestHandlerFacade.createSession(payload as never);
      case "delete-session": {
        const sessionId = readString(payload);
        const session = sessionRequestHandlerFacade
          .listSessions()
          .find((item) => item.id === sessionId);
        const result = sessionRequestHandlerFacade.deleteSession(sessionId);
        sessionEventStreamFacade.deleteSessionEvents(sessionId);
        this.deleteReasoningTranslationOverlays(session);
        this.deleteProviderSessionArtifacts(session);
        return result;
      }
      case "get-settings":
        return settingsStoreFacade.getSettings(
          readString(payload) || this.activeWorkspacePath()
        );
      case "get-localization-runtime-payload":
        return materializeCoreLocalizationRuntimePayload(
          settingsStoreFacade.getSettings(this.activeWorkspacePath())
        );
      case "ensure-glossary-file":
        return ensureCoreGlossaryFileRpcResult();
      case "rebuild-localization":
        return rebuildCoreLocalizationRpcResult(this.activeWorkspacePath());
      case "list-session-profiles":
        return listSessionProfilesRpcResult(payload);
      case "create-session-profile":
        return createSessionProfileRpcResult(payload);
      case "open-session-profile-file":
        return openSessionProfileFileRpcResult(payload);
      case "capture-native-request":
        return captureNativeRequestRpcResult(
          payload,
          this.activeWorkspacePath()
        );
      case "list-capturable-models":
        return listCapturableModelsRpcResult();
      case "get-local-models":
        return this.getLocalModels();
      case "get-provider-versions":
        return this.getProviderVersions();
      case "get-provider-system-settings":
        return providerAuthStoreFacade.getProviderSettings(
          readProviderId(payload)
        );
      case "save-provider-system-settings":
        return this.saveProviderSystemSettings(payload);
      case "reset-workspace-settings":
        return this.resetWorkspaceSettings();
      case "save-settings":
        return this.saveSettings(payload);
      case "update-provider-version":
        return this.updateProviderVersion(payload);
      case "restart-adapters":
        return this.restartAdapters();
      case "send-message":
        return sessionRequestHandlerFacade.sendMessage(payload as never);
      case "stop-turn":
        return sessionRequestHandlerFacade.stopTurn(readString(payload));
      case "translate-dynamic-text":
        return translateDynamicCoreText({
          category: readString(readRecord(payload)?.category),
          settings: settingsStoreFacade.getSettings(this.activeWorkspacePath()),
          text: readString(readRecord(payload)?.text),
        });
      default:
        return { error: `Unknown Core method: ${method}`, ok: false };
    }
  }

  private restoreState(): void {
    const snapshot = loadWorkspaceRegistrySnapshot();
    if (snapshot) {
      workspaceRegistryFacade.restoreSnapshot(snapshot);
    }
    const sessions = sessionRequestHandlerFacade.restoreSessionHistory(
      workspaceRegistryFacade.getKnownWorkspaces()
    );
    sessionEventStreamFacade.configureSessionHistory(sessions);
    sessionRequestHandlerFacade.restoreTelemetryHistory(
      sessionEventStreamFacade.latestTelemetryBySession()
    );
  }

  private addWorkspace(workspacePath: string): {
    ok: true;
    workspace: unknown;
  } {
    const workspace = workspaceRegistryFacade.addWorkspace(workspacePath);
    workspaceRegistryFacade.selectWorkspace(workspace.id);
    saveWorkspaceRegistrySnapshot(workspaceRegistryFacade.getSnapshot());
    this.providerLifecycle.registerAdapters();
    this.startWorkspaceProvisioning();
    return { ok: true, workspace };
  }

  private selectWorkspace(
    workspaceId: string
  ): { error: string; ok: false } | { ok: true; workspace: unknown } {
    try {
      const workspace = workspaceRegistryFacade.selectWorkspace(workspaceId);
      saveWorkspaceRegistrySnapshot(workspaceRegistryFacade.getSnapshot());
      this.providerLifecycle.registerAdapters();
      this.startWorkspaceProvisioning();
      return { ok: true, workspace };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  }

  private deleteProviderSessionArtifacts(
    session: CoreSession | undefined
  ): void {
    if (!(session?.providerSessionId && session.workspacePath)) {
      return;
    }
    const adapter = providerRegistryFacade.getAdapter(session.providerId);
    Promise.resolve(
      adapter?.deleteSessionArtifacts?.(
        session.providerSessionId,
        session.workspacePath
      )
    ).catch(() => undefined);
  }

  private deleteReasoningTranslationOverlays(
    session: CoreSession | undefined
  ): void {
    if (!session?.workspacePath) {
      return;
    }
    this.reasoningOverlayStore.deleteSessionOverlays(
      session.workspacePath,
      session.id
    );
  }

  private getSessionEvents(sessionId: string): unknown[] {
    sessionRequestHandlerFacade
      .refreshUsageLimits(sessionId)
      .catch(() => undefined);
    return sessionEventStreamFacade.listEvents(sessionId);
  }

  private async getLocalModels(): Promise<{
    error?: string;
    models?: string[];
    ok: boolean;
  }> {
    try {
      return { models: await loadLocalModels(), ok: true };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  }

  private async getProviderVersions(): Promise<{
    error?: string;
    ok: boolean;
    versions?: unknown;
  }> {
    try {
      return { ok: true, versions: await loadProviderVersions() };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  }

  private saveProviderSystemSettings(payload: unknown): {
    error?: string;
    ok: boolean;
    settings?: unknown;
  } {
    const request = readRecord(payload);
    const providerId = readProviderId(request?.providerId);
    if (!providerId) {
      return { error: "Unknown provider.", ok: false };
    }
    const settings = providerAuthStoreFacade.saveProviderSettings(
      providerId,
      readRecord(request?.settings) ?? {}
    );
    this.providerLifecycle.registerAdapter(providerId);
    return { ok: true, settings };
  }

  private resetWorkspaceSettings(): { ok: true; settings: unknown } {
    const settings = settingsStoreFacade.resetWorkspaceSettings(
      this.activeWorkspacePath()
    );
    this.providerLifecycle.registerAdapters();
    return { ok: true, settings };
  }

  private async saveSettings(
    payload: unknown
  ): Promise<{ ok: true; settings: unknown }> {
    const workspacePath = this.activeWorkspacePath();
    const previous = settingsStoreFacade.getSettings(workspacePath);
    const settings = settingsStoreFacade.saveSettings(
      (readRecord(payload)?.settings ?? payload) as HarnessSettings,
      workspacePath
    );
    if (settingsStoreFacade.shouldSyncLocalization(previous, settings)) {
      await materializeCoreLocalizationRuntimePayload(settings);
    }
    this.providerLifecycle.registerAdapters();
    return { ok: true, settings };
  }

  private async updateProviderVersion(payload: unknown): Promise<{
    error?: string;
    ok: boolean;
    versions?: unknown;
  }> {
    try {
      const request = readRecord(payload);
      if (request?.target === "cli") {
        await updateProviderCli(request?.provider);
      } else {
        const packageName = resolveProviderPackage(
          request?.provider,
          request?.target
        );
        await installLatestGlobalPackage(packageName);
      }
      this.providerLifecycle.registerAdapters();
      return { ok: true, versions: await loadProviderVersions() };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  }

  private restartAdapters(): {
    ok: true;
    providers: unknown;
    settings: unknown;
  } {
    this.providerLifecycle.registerAdapters();
    return {
      ok: true,
      providers: providerRegistryFacade.listProviders(),
      settings: settingsStoreFacade.getSettings(this.activeWorkspacePath()),
    };
  }

  private activeWorkspacePath(): string {
    return workspaceRegistryFacade.getActiveWorkspace().path;
  }

  private startWorkspaceProvisioning(): void {
    const workspace = workspaceRegistryFacade.getActiveWorkspace();
    providerWorkspaceProvisionerFacade
      .provisionWorkspace({
        workspaceId: workspace.id,
        workspacePath: workspace.path,
      })
      .catch(() => undefined);
  }
}

function loadWorkspaceRegistrySnapshot(): WorkspaceRegistrySnapshot | null {
  if (!existsSync(WORKSPACE_REGISTRY_FILE)) {
    return null;
  }
  try {
    const snapshot = JSON.parse(
      readFileSync(WORKSPACE_REGISTRY_FILE, "utf8")
    ) as unknown;
    return readRecord(snapshot)?.workspaces
      ? (snapshot as WorkspaceRegistrySnapshot)
      : null;
  } catch {
    return null;
  }
}

function saveWorkspaceRegistrySnapshot(snapshot: unknown): void {
  mkdirSync(dirname(WORKSPACE_REGISTRY_FILE), { recursive: true });
  writeFileSync(
    WORKSPACE_REGISTRY_FILE,
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
}

function readProviderId(value: unknown): ProviderId {
  if (PROVIDER_IDS.includes(value as ProviderId)) {
    return value as ProviderId;
  }
  throw new Error("Unknown provider.");
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const coreRuntimeApi = new CoreRuntimeApi();
