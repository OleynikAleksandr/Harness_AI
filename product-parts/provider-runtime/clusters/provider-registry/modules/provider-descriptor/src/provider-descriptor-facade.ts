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
  readonly defaultReasoningEffort: NativeCaptureReasoningEffort | null;
  readonly id: string;
  readonly label: string;
  readonly reasoningEfforts: readonly CapturableReasoningOption[];
}

export interface CapturableReasoningOption {
  readonly id: NativeCaptureReasoningEffort;
  readonly label: string;
}

export type NativeCaptureReasoningEffort =
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max"
  | "ultra";

export interface ProviderModelDescriptor {
  readonly description?: string;
  readonly id: string;
  readonly label: string;
}

// Verified Kimi Coding Plan catalog returned by GET /coding/v1/models for the
// current subscription key on 2026-07-16. This is provider-runtime truth; UI
// surfaces consume these descriptors instead of inventing model ids locally.
export const KIMI_CLIENT_MODELS: readonly ProviderModelDescriptor[] = [
  {
    description: "Standard K2.7 coding model.",
    id: "kimi-for-coding",
    label: "K2.7 Coding",
  },
  {
    description: "Stable high-speed K2.7 coding model.",
    id: "kimi-for-coding-highspeed",
    label: "K2.7 Coding HighSpeed",
  },
  {
    description: "Latest Kimi coding model available on the Allegretto plan.",
    id: "k3",
    label: "K3",
  },
];

// Model catalog for universal-client endpoint providers.
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
  "kimi-client": KIMI_CLIENT_MODELS,
};

// Models offered in the Native Request Capture UI, per capture provider.
// Different models can carry different system prompts, so capture is chosen
// per model. Ids mirror the provider model catalog. Capture covers the two
// native vendor channels. The ACP Kimi capture channel left with the
// kimi-provider retirement (2026-07-05).
const BASE_REASONING_EFFORTS = ["low", "medium", "high", "xhigh"] as const;
const REASONING_EFFORTS_WITH_MAX = [...BASE_REASONING_EFFORTS, "max"] as const;
const REASONING_EFFORTS_WITH_ULTRA = [
  ...REASONING_EFFORTS_WITH_MAX,
  "ultra",
] as const;
const REASONING_LABELS: Readonly<Record<NativeCaptureReasoningEffort, string>> =
  {
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "x-High",
    max: "Max",
    ultra: "Ultra",
  };

const capturableModel = (
  id: string,
  label: string,
  reasoningEfforts: readonly NativeCaptureReasoningEffort[],
  defaultReasoningEffort: NativeCaptureReasoningEffort | null = "medium"
): CapturableModel => ({
  defaultReasoningEffort,
  id,
  label,
  reasoningEfforts: reasoningEfforts.map((effort) => ({
    id: effort,
    label: REASONING_LABELS[effort],
  })),
});

const CAPTURABLE_MODELS: Readonly<Record<string, readonly CapturableModel[]>> =
  {
    // Claude Code 2.1.207 exposes these five values through the interactive
    // CLI's --effort flag for every captured alias. `ultracode` is a separate
    // session orchestration setting, not a reasoning-effort value.
    claude: [
      capturableModel("sonnet", "Sonnet", REASONING_EFFORTS_WITH_MAX),
      capturableModel("opus", "Opus", REASONING_EFFORTS_WITH_MAX),
      capturableModel("haiku", "Haiku", REASONING_EFFORTS_WITH_MAX),
    ],
    codex: [
      capturableModel(
        "gpt-5.6-sol",
        "GPT-5.6 Sol",
        REASONING_EFFORTS_WITH_ULTRA
      ),
      capturableModel(
        "gpt-5.6-terra",
        "GPT-5.6 Terra",
        REASONING_EFFORTS_WITH_ULTRA
      ),
      capturableModel(
        "gpt-5.6-luna",
        "GPT-5.6 Luna",
        REASONING_EFFORTS_WITH_MAX
      ),
      capturableModel("gpt-5.5", "GPT-5.5", BASE_REASONING_EFFORTS),
      capturableModel("gpt-5.4", "GPT-5.4", BASE_REASONING_EFFORTS),
      capturableModel("gpt-5.4-mini", "GPT-5.4 Mini", BASE_REASONING_EFFORTS),
      capturableModel(
        "gpt-5.3-codex-spark",
        "GPT-5.3-Codex-Spark",
        BASE_REASONING_EFFORTS,
        "high"
      ),
    ],
    // Kimi exposes no independent reasoning control in the native CLI. The
    // three ids are the verified Coding Plan catalog; capture materializes a
    // temporary CLI alias and preserves the provider default for each model.
    kimi: KIMI_CLIENT_MODELS.map((model) =>
      capturableModel(model.id, model.label, [], null)
    ),
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

  getCapturableModel(
    providerId: string,
    modelId: string
  ): CapturableModel | null {
    return (
      this.getCapturableModels(providerId).find(
        (model) => model.id === modelId
      ) ?? null
    );
  }

  getCaptureProviderIds(): readonly string[] {
    return Object.keys(CAPTURABLE_MODELS);
  }

  getClientModels(providerId: string): readonly ProviderModelDescriptor[] {
    return CLIENT_PROVIDER_MODELS[providerId] ?? [];
  }
}

export const providerDescriptorFacade = new ProviderDescriptorFacade();
