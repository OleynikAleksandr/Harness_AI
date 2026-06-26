export interface ProviderModelSyncCapabilities {
  acceptsAppliedTurnConfig: boolean;
  supportsReasoningSelection: boolean;
}

export interface ProviderCapabilities {
  modelSync: ProviderModelSyncCapabilities;
  requiresProviderHome: boolean;
  supportsImmediateBinding: boolean;
}

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  modelSync: {
    acceptsAppliedTurnConfig: true,
    supportsReasoningSelection: true,
  },
  requiresProviderHome: true,
  supportsImmediateBinding: true,
};

const HTTP_COMPATIBLE_CAPABILITIES: ProviderCapabilities = {
  ...DEFAULT_CAPABILITIES,
  requiresProviderHome: false,
};

export class ProviderDescriptorFacade {
  getCapabilities(providerId: string): ProviderCapabilities {
    if (providerId === "openrouter" || providerId === "local-models") {
      return HTTP_COMPATIBLE_CAPABILITIES;
    }
    return DEFAULT_CAPABILITIES;
  }
}

export const providerDescriptorFacade = new ProviderDescriptorFacade();
