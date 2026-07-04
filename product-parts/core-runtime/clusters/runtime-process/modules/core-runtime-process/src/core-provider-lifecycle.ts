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
import { registerProviderAdapterInstance } from "./core-provider-adapter-registration.js";

export type CoreEventListener = (event: unknown) => void;

export const PROVIDER_IDS: ProviderId[] = [
  "claude",
  "codex",
  "kimi",
  // Internal universal-client Kimi endpoint: registered and routable by id
  // (RPC provider-id validation reads this list) while the visible picker
  // still hides it until the visibility switch.
  "kimi-client",
  // Internal universal-client GLM endpoint: routable by id before the visible
  // GLM switch.
  "glm-client",
  "glm-native",
  "glm-opencode",
  "openrouter",
  "local-models",
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
