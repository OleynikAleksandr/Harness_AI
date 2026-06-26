import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export type ProviderSessionBindingStatus = "pending" | "ready" | "failed";

export interface ProviderSessionBinding {
  error?: string;
  providerId: ProviderId;
  providerSessionId?: string;
  sessionId: string;
  status: ProviderSessionBindingStatus;
  updatedAt: string;
}

export class ProviderSessionBindingFacade {
  private readonly bindings = new Map<string, ProviderSessionBinding>();

  createPending(sessionId: string, providerId: ProviderId): ProviderSessionBinding {
    return this.setBinding({
      providerId,
      sessionId,
      status: "pending",
      updatedAt: new Date().toISOString()
    });
  }

  markReady(
    sessionId: string,
    providerId: ProviderId,
    providerSessionId: string
  ): ProviderSessionBinding {
    return this.setBinding({
      providerId,
      providerSessionId,
      sessionId,
      status: "ready",
      updatedAt: new Date().toISOString()
    });
  }

  markFailed(
    sessionId: string,
    providerId: ProviderId,
    error: string
  ): ProviderSessionBinding {
    return this.setBinding({
      error,
      providerId,
      sessionId,
      status: "failed",
      updatedAt: new Date().toISOString()
    });
  }

  getBinding(sessionId: string): ProviderSessionBinding | null {
    return this.bindings.get(sessionId) ?? null;
  }

  listBindings(): ProviderSessionBinding[] {
    return Array.from(this.bindings.values());
  }

  clear(sessionId: string): boolean {
    return this.bindings.delete(sessionId);
  }

  private setBinding(binding: ProviderSessionBinding): ProviderSessionBinding {
    this.bindings.set(binding.sessionId, binding);
    return binding;
  }
}

export const providerSessionBindingFacade = new ProviderSessionBindingFacade();
