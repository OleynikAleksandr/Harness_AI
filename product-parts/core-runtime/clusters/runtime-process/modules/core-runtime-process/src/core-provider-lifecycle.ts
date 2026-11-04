import { providerAuthStoreFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { providerLivenessCheckerFacade } from "../../../../../../provider-runtime/clusters/provider-readiness/modules/provider-liveness-checker/src/provider-liveness-checker-facade.js";
import {
  type ProviderReadinessRawChange,
  providerReadinessRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-readiness/modules/provider-readiness-registry/src/provider-readiness-registry-facade.js";
import {
  type ProviderId,
  providerRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { workspaceRegistryFacade } from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { ensureLocalModelsServer } from "./core-local-server-autostart.js";
import { registerProviderAdapterInstance } from "./core-provider-adapter-registration.js";

export type CoreEventListener = (event: unknown) => void;

export const PROVIDER_IDS: ProviderId[] = [
  "claude",
  "codex",
  "grok",
  // Universal-client endpoints stay registered and routable by id; RPC
  // provider-id validation reads this list. The ACP `kimi` id left with the
  // kimi-provider retirement (2026-07-05 user order).
  "kimi-client",
  "glm-client",
  "openrouter-client",
  "local-models-client",
];

export class CoreProviderLifecycle {
  private readonly providerStatusListeners = new Set<CoreEventListener>();
  private readinessUnsubscribe: (() => void) | null = null;

  addStatusListener(listener: CoreEventListener): () => void {
    this.providerStatusListeners.add(listener);
    return () => {
      this.providerStatusListeners.delete(listener);
    };
  }

  /**
   * Re-registers every provider adapter for the active workspace. Without an
   * active project the adapters are only cleared: none is registered.
   */
  registerAdapters(): void {
    this.syncProviderReadinessWorkspace();
    providerRegistryFacade.clearAdapters();
    if (!workspaceRegistryFacade.getActiveWorkspace()) {
      return;
    }
    for (const providerId of PROVIDER_IDS) {
      this.registerAdapter(providerId);
    }
  }

  /** Registers one adapter for the active workspace; skipped without one. */
  registerAdapter(providerId: ProviderId): void {
    const workspacePath = workspaceRegistryFacade.getActiveWorkspace()?.path;
    if (!workspacePath) {
      return;
    }
    const settings = settingsStoreFacade.getSettings(workspacePath);
    const model = settingsStoreFacade.getProviderModel(
      providerId,
      workspacePath
    ).selectedModel;
    const reasoningEffort =
      providerId === "grok"
        ? settings.providers.grok.reasoningByModel[model]
        : undefined;
    registerProviderAdapterInstance(
      providerId,
      model,
      workspacePath,
      reasoningEffort
    );
  }

  startLivenessPreflight(): void {
    providerLivenessCheckerFacade
      .checkProviders(PROVIDER_IDS)
      .catch(() => undefined);
    // Unconditional LM Studio autostart (user order 2026-07-05): launch the
    // local server in the background when it is down and re-run its liveness
    // once it answers; machines without LM Studio skip silently.
    ensureLocalModelsServer({
      onReady: () => {
        providerLivenessCheckerFacade
          .checkProvider("local-models-client")
          .catch(() => undefined);
      },
      resolveBaseUrl: () =>
        providerAuthStoreFacade.getBaseUrl("local-models-client") ??
        settingsStoreFacade.getSettings().providers.localModels.baseUrl,
    }).catch(() => undefined);
  }

  subscribeReadiness(): void {
    if (this.readinessUnsubscribe) {
      return;
    }
    this.readinessUnsubscribe = providerReadinessRegistryFacade.subscribe(
      (change) => this.handleProviderReadinessChange(change)
    );
  }

  private handleProviderReadinessChange(
    change: ProviderReadinessRawChange
  ): void {
    if (
      change.scope === "provisioning" &&
      change.workspaceId !== activeWorkspaceId()
    ) {
      return;
    }
    this.publishProviderStatus(change.providerId);
  }

  private publishProviderStatus(providerId: string): void {
    const workspaceId = activeWorkspaceId();
    const readiness = providerReadinessRegistryFacade.combine(
      providerId,
      workspaceId
    );
    const event = {
      payload: {
        providerId,
        workspaceId,
        ...readiness,
      },
      timestamp: new Date().toISOString(),
      type: "provider:status",
    };
    for (const listener of this.providerStatusListeners) {
      listener(event);
    }
  }

  private syncProviderReadinessWorkspace(): void {
    providerRegistryFacade.setReadinessWorkspace(activeWorkspaceId());
  }
}

/** The active workspace id; `""` (no provisioning scope) without a project. */
function activeWorkspaceId(): string {
  return workspaceRegistryFacade.getActiveWorkspace()?.id ?? "";
}
