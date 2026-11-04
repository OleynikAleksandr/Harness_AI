import { refreshClaudeModelCatalog } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.js";
import { refreshCodexModelCatalog } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.js";
import { refreshKimiModelCatalog } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/src/kimi-client-provider-facade.js";
import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import {
  type ProviderId,
  providerRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { workflowHostFacade } from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import { sessionEventStreamFacade } from "../../../../session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import { sessionProviderInteractionLifecycle } from "../../../../session-runtime/modules/session-request-handler/src/session-provider-interaction-lifecycle.js";
import { sessionRequestHandlerFacade } from "../../../../session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import {
  type HarnessSettings,
  settingsStoreFacade,
} from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { workspaceRegistryFacade } from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { translateDynamicCoreText } from "./core-dynamic-translation.js";
import { ensureCoreGlossaryFileRpcResult } from "./core-glossary-rpc.js";
import { rebuildCoreLocalizationRpcResult } from "./core-localization-rebuild-rpc.js";
import { materializeCoreLocalizationRuntimePayload } from "./core-localization-runtime.js";
import {
  captureNativeRequestRpcResult,
  listCapturableModelsRpcResult,
} from "./core-native-capture-rpc.js";
import { coreProfileStudioRpcFacade } from "./core-profile-studio-rpc.js";
import { CoreProjectWorkflowRpc } from "./core-project-workflow-rpc.js";
import {
  type CoreEventListener,
  CoreProviderLifecycle,
  PROVIDER_IDS,
} from "./core-provider-lifecycle.js";
import {
  applyLocalModelContext,
  loadLocalModelEntries,
  loadProviderVersions,
  startProviderAutoUpdates,
  updateProviderTarget,
} from "./core-provider-tools.js";
import {
  createSessionProfileRpcResult,
  listSessionProfilesRpcResult,
  openSessionProfileFileRpcResult,
  SESSION_PROFILES_UPDATED_EVENT_TYPE,
  sessionProfileStore,
} from "./core-session-profile-rpc.js";
import { CoreWorkspaceRpc } from "./core-workspace-rpc.js";

export class CoreRuntimeApi {
  private initialized = false;
  private readonly providerLifecycle = new CoreProviderLifecycle();
  private readonly workspaces = new CoreWorkspaceRpc({
    registerAdapters: () => this.providerLifecycle.registerAdapters(),
  });
  private readonly projectWorkflow = new CoreProjectWorkflowRpc({
    addWorkspace: (workspacePath) =>
      this.workspaces.add(workspacePath).workspace,
    host: workflowHostFacade,
    sessions: {
      get: (sessionId) =>
        sessionRequestHandlerFacade
          .listSessions()
          .find((session) => session.id === sessionId),
      list: () => sessionRequestHandlerFacade.listSessions(),
      send: (sessionId, text) =>
        sessionRequestHandlerFacade.sendMessage({ sessionId, text }),
      subscribe: (listener) => sessionEventStreamFacade.subscribe(listener),
    },
    workspaces: () => ({
      active: workspaceRegistryFacade.getActiveWorkspace(),
      known: workspaceRegistryFacade.getKnownWorkspaces(),
    }),
  });

  initialize(): void {
    if (this.initialized) {
      return;
    }
    // Live provider model catalogs (Kimi, Codex, Claude): each persisted catalog is
    // applied synchronously before settings and adapters read it; the live
    // refresh finishes in the background.
    refreshKimiModelCatalog().catch(() => undefined);
    refreshCodexModelCatalog().catch(() => undefined);
    refreshClaudeModelCatalog().catch(() => undefined);
    startProviderAutoUpdates();
    this.restoreState();
    this.projectWorkflow.watchWorkspaces();
    this.providerLifecycle.registerAdapters();
    this.providerLifecycle.subscribeReadiness();
    this.providerLifecycle.startLivenessPreflight();
    this.workspaces.startProvisioning();
    sessionRequestHandlerFacade.resumeRestoredSessions();
    this.initialized = true;
  }

  subscribe(listener: CoreEventListener): () => void {
    const unsubscribeSession = sessionEventStreamFacade.subscribe(listener);
    const unsubscribeProviderStatus =
      this.providerLifecycle.addStatusListener(listener);
    const unsubscribeWorkflow = this.projectWorkflow.subscribe(listener);
    const unsubscribeProfiles = sessionProfileStore.watchProfiles(() => {
      listener({ type: SESSION_PROFILES_UPDATED_EVENT_TYPE });
      listener({
        profileId: null,
        reason: "profile-files-changed",
        type: "profile-studio:updated",
      });
    });
    return () => {
      unsubscribeSession();
      unsubscribeProviderStatus();
      unsubscribeWorkflow();
      unsubscribeProfiles();
    };
  }

  invoke(method: string, payload: unknown): unknown {
    this.initialize();
    if (CoreProjectWorkflowRpc.handles(method)) {
      return this.projectWorkflow.invoke(method, payload);
    }
    if (CoreWorkspaceRpc.handles(method)) {
      const result = this.workspaces.invoke(method, payload);
      // Kit state watchers follow the registry (add, select, remove).
      Promise.resolve(result)
        .then(() => this.projectWorkflow.watchWorkspaces())
        .catch(() => undefined);
      return result;
    }
    switch (method) {
      case "list-sessions":
        return sessionRequestHandlerFacade.listSessions(readString(payload));
      case "get-session-events":
        return this.getSessionEvents(readString(payload));
      case "list-providers":
        return providerRegistryFacade.listProviders();
      case "create-session":
        return sessionRequestHandlerFacade.createSession(payload as never);
      case "list-profile-studio-targets":
        return coreProfileStudioRpcFacade.listTargets();
      case "list-profile-studio-profiles":
        return coreProfileStudioRpcFacade.listProfiles(payload);
      case "get-profile-studio-profile":
        return coreProfileStudioRpcFacade.getProfile(payload);
      case "create-profile-studio-draft":
        return coreProfileStudioRpcFacade.createDraft(payload);
      case "approve-profile-studio-draft":
        return coreProfileStudioRpcFacade.approveDraft(payload);
      case "delete-profile-studio-profile":
        return coreProfileStudioRpcFacade.deleteProfile(payload);
      case "delete-session": {
        // The request-handler cascade is the single cleanup route: it closes
        // bindings and removes provider artifacts, event JSONL and reasoning
        // translation overlays for every session in the deleted tree.
        const sessionId = readString(payload);
        return sessionRequestHandlerFacade.deleteSession(sessionId);
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
      case "list-provider-model-catalogs":
        return this.listProviderModelCatalogs();
      case "get-local-models":
        return this.getLocalModels();
      case "set-local-model-context":
        return this.setLocalModelContext(payload);
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
      case "rollback-session-turns":
        return sessionRequestHandlerFacade.rollbackSessionTurns(
          payload as never
        );
      case "rename-session":
        return sessionRequestHandlerFacade.renameSession(payload as never);
      case "regenerate-session-title":
        return sessionRequestHandlerFacade.regenerateSessionTitle(
          payload as never
        );
      case "respond-provider-interaction":
        return sessionProviderInteractionLifecycle.respond(payload);
      case "send-message":
        this.projectWorkflow.userMessage(
          readString(readRecord(payload)?.sessionId)
        );
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

  /** Releases Core resources before the process exits. */
  shutdown(): void {
    this.projectWorkflow.close();
  }

  private restoreState(): void {
    sessionRequestHandlerFacade.restoreSessionHistory(
      this.workspaces.restore()
    );
    sessionRequestHandlerFacade.restoreTelemetryHistory(
      sessionEventStreamFacade.latestTelemetryBySession()
    );
  }

  private getSessionEvents(sessionId: string): unknown[] {
    sessionRequestHandlerFacade
      .refreshUsageLimits(sessionId)
      .catch(() => undefined);
    return sessionEventStreamFacade.listEvents(sessionId);
  }

  // Settings model cards: refresh the live catalogs (memoized for their TTL)
  // and serve what Core now uses; a failed read keeps the served catalog.
  private async listProviderModelCatalogs() {
    await Promise.allSettled([
      refreshKimiModelCatalog(),
      refreshCodexModelCatalog(),
      refreshClaudeModelCatalog(),
    ]);
    return settingsStoreFacade.listProviderModelCatalogs();
  }

  private async getLocalModels(): Promise<{
    entries?: unknown[];
    error?: string;
    models?: string[];
    ok: boolean;
  }> {
    try {
      const entries = await loadLocalModelEntries();
      return {
        entries,
        models: entries.map((entry) => entry.key),
        ok: true,
      };
    } catch (error) {
      return { error: describeError(error), ok: false };
    }
  }

  // Persist the per-model context wish and apply it immediately through the
  // LM Studio management API (reload semantics; 0 clears the wish and leaves
  // the running instance alone), returning the refreshed catalog.
  private async setLocalModelContext(payload: unknown): Promise<{
    entries?: unknown[];
    error?: string;
    ok: boolean;
  }> {
    const record = readRecord(payload);
    const model = typeof record?.model === "string" ? record.model : "";
    const contextLength = record?.contextLength;
    if (
      !model ||
      typeof contextLength !== "number" ||
      !Number.isInteger(contextLength) ||
      contextLength < 0
    ) {
      return { error: "Invalid set-local-model-context payload.", ok: false };
    }
    try {
      const workspacePath = this.activeWorkspacePath();
      const next = structuredClone(
        settingsStoreFacade.getSettings(workspacePath)
      );
      if (contextLength === 0) {
        delete next.providers.localModels.contextLengthByModel[model];
      } else {
        next.providers.localModels.contextLengthByModel[model] = contextLength;
      }
      settingsStoreFacade.saveSettings(next, workspacePath);
      const { applied, entries } = await applyLocalModelContext(
        model,
        contextLength
      );
      if (contextLength > 0 && applied === null) {
        // The wish is persisted either way; the reload itself did not finish
        // (server down, old LM Studio, or the load failed — see its log).
        return {
          entries,
          error:
            "Model reload did not complete (see the LM Studio server log). The context wish is saved and will be applied on the next session start.",
          ok: false,
        };
      }
      return { entries, ok: true };
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
      await updateProviderTarget(request?.provider, request?.target);
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
