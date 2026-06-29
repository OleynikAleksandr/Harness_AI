import type { ProviderAdapter } from "../../../../provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  type ProviderDescriptor,
  type ProviderId,
  providerRegistryFacade,
} from "../../../../provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { providerReadinessRegistryFacade } from "../../provider-readiness-registry/src/provider-readiness-registry-facade.js";

interface ProviderWorkspaceProvisionerDeps {
  providerRegistry: {
    getAdapter(providerId: ProviderId): ProviderAdapter | null;
    listProviders(): ProviderDescriptor[];
  };
  readinessRegistry: {
    setProvisioning(
      providerId: string,
      workspaceId: string,
      status: "preparing" | "ready" | "failed",
      message?: string
    ): void;
  };
}

export class ProviderWorkspaceProvisionerFacade {
  private readonly deps: ProviderWorkspaceProvisionerDeps;

  constructor(deps: Partial<ProviderWorkspaceProvisionerDeps> = {}) {
    this.deps = {
      providerRegistry: deps.providerRegistry ?? providerRegistryFacade,
      readinessRegistry:
        deps.readinessRegistry ?? providerReadinessRegistryFacade,
    };
  }

  async provisionWorkspace(request: {
    workspaceId: string;
    workspacePath: string;
  }): Promise<void> {
    for (const provider of this.deps.providerRegistry.listProviders()) {
      await this.provisionProvider(provider.id, request);
    }
  }

  private async provisionProvider(
    providerId: ProviderId,
    request: { workspaceId: string; workspacePath: string }
  ): Promise<void> {
    this.deps.readinessRegistry.setProvisioning(
      providerId,
      request.workspaceId,
      "preparing"
    );
    try {
      await this.deps.providerRegistry
        .getAdapter(providerId)
        ?.ensureWorkspaceHome?.(request.workspacePath);
      this.deps.readinessRegistry.setProvisioning(
        providerId,
        request.workspaceId,
        "ready"
      );
    } catch (error) {
      this.deps.readinessRegistry.setProvisioning(
        providerId,
        request.workspaceId,
        "failed",
        provisioningFailureMessage(providerId, error)
      );
    }
  }
}

function provisioningFailureMessage(providerId: ProviderId, error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return `Provider ${providerId} workspace home is not ready. Check provider auth.`;
}

export const providerWorkspaceProvisionerFacade =
  new ProviderWorkspaceProvisionerFacade();
