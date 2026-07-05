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

export interface ProviderModelDescriptor {
  readonly id: string;
  readonly label: string;
}

// Model catalog for universal-client endpoint providers. Kimi Code exposes a
// single public coding model id and rotates the backend behind it. The
// kimi-client provider stays internal until the Phase 2 visibility switch.
const CLIENT_PROVIDER_MODELS: Readonly<
  Record<string, readonly ProviderModelDescriptor[]>
> = {
  "glm-client": [
    { id: "glm-5.2", label: "GLM 5.2" },
    { id: "glm-5.1", label: "GLM 5.1" },
    { id: "glm-5-turbo", label: "GLM 5 Turbo" },
    { id: "glm-4.7", label: "GLM 4.7" },
    { id: "glm-4.6", label: "GLM 4.6" },
  ],
  "kimi-client": [{ id: "kimi-for-coding", label: "Kimi For Coding" }],
};

// Models offered in the Native Request Capture UI, per capture provider.
// Different models can carry different system prompts, so capture is chosen
// per model. Ids mirror the provider model catalog. Capture covers the two
// native vendor channels only: the ACP Kimi capture channel left with the
// kimi-provider retirement (2026-07-05); universal-client endpoints need no
// capture — our own client owns their requests.
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
  };

const HTTP_COMPATIBLE_PROVIDER_IDS = new Set([
  // Universal-client endpoint: key-only auth from Core settings, no provider home.
  "glm-client",
  "kimi-client",
  // Universal-client endpoint: base URL + optional key from Core settings.
  "local-models-client",
  // Universal-client endpoint: the shared OpenRouter key from Core settings.
  "openrouter-client",
]);

export class ProviderDescriptorFacade {
  getCapabilities(providerId: string): ProviderCapabilities {
    if (HTTP_COMPATIBLE_PROVIDER_IDS.has(providerId)) {
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

  getClientModels(providerId: string): readonly ProviderModelDescriptor[] {
    return CLIENT_PROVIDER_MODELS[providerId] ?? [];
  }
}

export const providerDescriptorFacade = new ProviderDescriptorFacade();
