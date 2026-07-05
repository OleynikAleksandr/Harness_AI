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
  "kimi",
  // Universal-client endpoints stay registered and routable by id; RPC
  // provider-id validation reads this list.
  "kimi-client",
  "glm-client",
  "glm-native",
  "openrouter",
  "openrouter-client",
  "local-models",
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

  registerAdapters(): void {
    this.syncProviderReadinessWorkspace();
    providerRegistryFacade.clearAdapters();
    for (const providerId of PROVIDER_IDS) {
      this.registerAdapter(providerId);
    }
  }

  registerAdapter(providerId: ProviderId): void {
    const workspacePath = this.activeWorkspacePath();
    const model =
      settingsStoreFacade.getProviderModel(providerId, workspacePath)
        .selectedModel ?? providerAuthStoreFacade.getModel(providerId);
    registerProviderAdapterInstance(providerId, model, workspacePath);
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

  private activeWorkspacePath(): string {
    return workspaceRegistryFacade.getActiveWorkspace().path;
  }

  private handleProviderReadinessChange(
    change: ProviderReadinessRawChange
  ): void {
    const activeWorkspace = workspaceRegistryFacade.getActiveWorkspace();
    if (
      change.scope === "provisioning" &&
      change.workspaceId !== activeWorkspace.id
    ) {
      return;
    }
    this.publishProviderStatus(change.providerId);
  }

  private publishProviderStatus(providerId: string): void {
    const workspace = workspaceRegistryFacade.getActiveWorkspace();
    const readiness = providerReadinessRegistryFacade.combine(
      providerId,
      workspace.id
    );
    const event = {
      payload: {
        providerId,
        workspaceId: workspace.id,
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
    providerRegistryFacade.setReadinessWorkspace(
      workspaceRegistryFacade.getActiveWorkspace().id
    );
  }
}
