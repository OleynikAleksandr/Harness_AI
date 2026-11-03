import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { refreshClaudeModelCatalog } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.js";
import { refreshCodexModelCatalog } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.js";
import { refreshKimiModelCatalog } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/src/kimi-client-provider-facade.js";
import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { providerWorkspaceProvisionerFacade } from "../../../../../../provider-runtime/clusters/provider-readiness/modules/provider-workspace-provisioner/src/provider-workspace-provisioner-facade.js";
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
import {
  type HarnessWorkspace,
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

const WORKSPACE_REGISTRY_FILE = join(
  process.env.HARNESS_AI_HOME || join(homedir(), ".harness-ai"),
  "workspaces.json"
);

export class CoreRuntimeApi {
  private initialized = false;
  private readonly providerLifecycle = new CoreProviderLifecycle();
  private readonly projectWorkflow = new CoreProjectWorkflowRpc({
    addWorkspace: (workspacePath) => this.addWorkspace(workspacePath).workspace,
    host: workflowHostFacade,
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
    sessionRequestHandlerFacade.restoreSessionHistory(
      workspaceRegistryFacade.getKnownWorkspaces()
    );
    sessionRequestHandlerFacade.restoreTelemetryHistory(
      sessionEventStreamFacade.latestTelemetryBySession()
    );
  }

  private addWorkspace(workspacePath: string): {
    ok: true;
    workspace: HarnessWorkspace;
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
