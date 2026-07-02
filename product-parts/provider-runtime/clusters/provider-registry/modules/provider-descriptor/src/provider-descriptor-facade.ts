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

export interface CapturableModel {
  readonly id: string;
  readonly label: string;
}

// Models offered in the Native Request Capture UI, per capture provider.
// Different models can carry different system prompts, so capture is chosen
// per model. Ids mirror the provider model catalog; GLM Native needs no
// capture (our adapter owns its stack) and is intentionally absent.
const CAPTURABLE_MODELS: Readonly<Record<string, readonly CapturableModel[]>> =
  {
    claude: [
      { id: "sonnet", label: "Sonnet" },
      { id: "opus", label: "Opus" },
      { id: "haiku", label: "Haiku" },
    ],
    codex: [
      { id: "gpt-5.2", label: "GPT-5.2" },
      { id: "gpt-5.3-codex-spark", label: "GPT-5.3-Codex-Spark" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
      { id: "gpt-5.4", label: "GPT-5.4" },
      { id: "gpt-5.5", label: "GPT-5.5" },
    ],
    kimi: [
      { id: "kimi-k2.7-code", label: "Kimi K2.7 Code" },
      { id: "kimi-k2.7-code-highspeed", label: "Kimi K2.7 Code High Speed" },
    ],
  };

export class ProviderDescriptorFacade {
  getCapabilities(providerId: string): ProviderCapabilities {
    if (providerId === "openrouter" || providerId === "local-models") {
      return HTTP_COMPATIBLE_CAPABILITIES;
    }
    return DEFAULT_CAPABILITIES;
  }

  getCapturableModels(providerId: string): readonly CapturableModel[] {
    return CAPTURABLE_MODELS[providerId] ?? [];
  }

  getCaptureProviderIds(): readonly string[] {
    return Object.keys(CAPTURABLE_MODELS);
  }
}

export const providerDescriptorFacade = new ProviderDescriptorFacade();
