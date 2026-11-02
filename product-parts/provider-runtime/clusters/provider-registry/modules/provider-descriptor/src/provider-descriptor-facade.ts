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
  // Native context window in tokens, when the provider catalog declares it.
  readonly contextLength?: number;
  // Provider default thinking effort, when the catalog declares efforts.
  readonly defaultReasoningEffort?: string;
  readonly description?: string;
  readonly id: string;
  readonly label: string;
  // Thinking efforts the provider accepts for this model; absent when the
  // model has no selectable effort.
  readonly reasoningEfforts?: readonly string[];
}

// Verified Kimi Coding Plan catalog: the rows GET /coding/v1/models returned
// for the subscription key on 2026-11-02 (display names, context windows and
// `think_efforts`). It is only the offline fallback — Core replaces it with
// the live catalog through `setKimiClientModels` (kimi-client-provider
// `kimi-model-catalog`), so newly published models appear without a code
// change. This is provider-runtime truth; UI surfaces consume these
// descriptors instead of inventing model ids locally.
const KIMI_EFFORTS = ["low", "high", "max"] as const;
export const KIMI_CLIENT_MODELS: readonly ProviderModelDescriptor[] = [
  {
    contextLength: 1_048_576,
    defaultReasoningEffort: "max",
    id: "kimi-for-coding",
    label: "K2.8 Preview",
    reasoningEfforts: KIMI_EFFORTS,
  },
  {
    contextLength: 262_144,
    id: "kimi-for-coding-highspeed",
    label: "K2.7 Code Highspeed",
  },
  {
    contextLength: 1_048_576,
    defaultReasoningEffort: "high",
    id: "k3",
    label: "K3",
    reasoningEfforts: KIMI_EFFORTS,
  },
  {
    contextLength: 262_144,
    defaultReasoningEffort: "high",
    id: "k3-256k",
    label: "K3-256k",
    reasoningEfforts: KIMI_EFFORTS,
  },
  {
    contextLength: 1_048_576,
    defaultReasoningEffort: "high",
    id: "k3.1-pro",
    label: "K3.1 Pro",
    reasoningEfforts: KIMI_EFFORTS,
  },
  {
    contextLength: 1_048_576,
    defaultReasoningEffort: "high",
    id: "k3.1-pro-highspeed",
    label: "K3.1 Pro Highspeed 2x Usage Cost",
    reasoningEfforts: KIMI_EFFORTS,
  },
];

// Catalog-fallback Kimi context window for model ids outside the catalog
// (config-aliased custom models).
export const KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH = 262_144;

// The Kimi catalog Core currently serves: the verified fallback until the
// persisted or live catalog is applied.
let kimiClientModels: readonly ProviderModelDescriptor[] = KIMI_CLIENT_MODELS;

export function kimiClientModelContextLength(model: string): number {
  return (
    kimiClientModels.find((descriptor) => descriptor.id === model)
      ?.contextLength ?? KIMI_CLIENT_FALLBACK_CONTEXT_LENGTH
  );
}

// Verified Claude catalog: the `supportedModels()` rows (minus the
// `default` alias) the Harness-installed Claude Agent SDK 0.3.207 returned on
// 2026-11-02. It is only the offline fallback — Core replaces it with the
// live catalog through `setClaudeModels` (claude-provider
// `claude-model-catalog`). Ids are the values the SDK accepts as `model`.
const CLAUDE_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const CLAUDE_MODELS: readonly ProviderModelDescriptor[] = [
  {
    description: "Opus 4.8 with 1M context · Best for everyday, complex tasks",
    id: "opus[1m]",
    label: "Opus",
    reasoningEfforts: CLAUDE_EFFORTS,
  },
  {
    description:
      "Fable 5 · Most capable for your hardest and longest-running tasks",
    id: "claude-fable-5[1m]",
    label: "Fable",
    reasoningEfforts: CLAUDE_EFFORTS,
  },
  {
    description: "Sonnet 5 · Efficient for routine tasks",
    id: "sonnet",
    label: "Sonnet",
    reasoningEfforts: CLAUDE_EFFORTS,
  },
  {
    description: "Haiku 4.5 · Fastest for quick answers",
    id: "haiku",
    label: "Haiku",
  },
];

let claudeModels: readonly ProviderModelDescriptor[] = CLAUDE_MODELS;

// Verified Codex catalog: the visible rows the app-server `model/list`
// request returned on 2026-11-02 (codex-cli 0.166.0). It is only the offline
// fallback — Core replaces it with the live catalog through `setCodexModels`
// (codex-provider `codex-model-catalog`).
const CODEX_ALL_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
] as const;
const CODEX_EFFORTS_TO_MAX = ["low", "medium", "high", "xhigh", "max"] as const;
export const CODEX_MODELS: readonly ProviderModelDescriptor[] = [
  {
    defaultReasoningEffort: "low",
    description: "Latest workhorse model for coding and everyday work.",
    id: "gpt-6.1-sol",
    label: "GPT-6.1-Sol",
    reasoningEfforts: CODEX_ALL_EFFORTS,
  },
  {
    defaultReasoningEffort: "medium",
    description: "Frontier intelligence for the most demanding work.",
    id: "gpt-6-astra",
    label: "GPT-6-Astra",
    reasoningEfforts: CODEX_ALL_EFFORTS,
  },
  {
    defaultReasoningEffort: "low",
    description: "GPT-6.1 Terra Codex model.",
    id: "gpt-6.1-terra",
    label: "GPT-6.1 Terra",
    reasoningEfforts: CODEX_ALL_EFFORTS,
  },
  {
    defaultReasoningEffort: "medium",
    description: "Previous generation workhorse model.",
    id: "gpt-6-sol",
    label: "GPT-6-Sol",
    reasoningEfforts: CODEX_ALL_EFFORTS,
  },
  {
    defaultReasoningEffort: "medium",
    description: "Fast and affordable model for easier tasks.",
    id: "gpt-6-luna",
    label: "GPT-6-Luna",
    reasoningEfforts: CODEX_EFFORTS_TO_MAX,
  },
  {
    defaultReasoningEffort: "low",
    description: "Older generation workhorse model.",
    id: "gpt-5.6-sol",
    label: "GPT-5.6-Sol",
    reasoningEfforts: CODEX_ALL_EFFORTS,
  },
  {
    defaultReasoningEffort: "medium",
    description: "Older balanced model for straightforward work.",
    id: "gpt-5.6-terra",
    label: "GPT-5.6-Terra",
    reasoningEfforts: CODEX_ALL_EFFORTS,
  },
  {
    defaultReasoningEffort: "medium",
    description: "Older fast and efficient model.",
    id: "gpt-5.6-luna",
    label: "GPT-5.6-Luna",
    reasoningEfforts: CODEX_EFFORTS_TO_MAX,
  },
];

let codexModels: readonly ProviderModelDescriptor[] = CODEX_MODELS;

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
};

// Models offered in the Native Request Capture UI, per capture provider.
// Different models can carry different system prompts, so capture is chosen
// per model. Ids mirror the provider model catalog. Capture covers the two
// native vendor channels. The ACP Kimi capture channel left with the
// kimi-provider retirement (2026-07-05).
const REASONING_LABELS: Readonly<Record<NativeCaptureReasoningEffort, string>> =
  {
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "x-High",
    max: "Max",
    ultra: "Ultra",
  };

const isNativeCaptureReasoningEffort = (
  effort: string | undefined
): effort is NativeCaptureReasoningEffort =>
  effort !== undefined && Object.hasOwn(REASONING_LABELS, effort);

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

// Capture providers in UI order; each capture catalog follows that
// provider's served live model catalog.
const CAPTURE_PROVIDER_IDS = ["claude", "codex", "kimi"] as const;

// A live catalog model as a capture choice: its own effort list (limited to
// the capture effort values) and default effort, `medium` when the catalog
// declares none in the list.
const capturableFromCatalog = (
  model: ProviderModelDescriptor
): CapturableModel => {
  const efforts = (model.reasoningEfforts ?? []).filter(
    isNativeCaptureReasoningEffort
  );
  const fallbackDefault = efforts.includes("medium") ? "medium" : null;
  return capturableModel(
    model.id,
    model.label,
    efforts,
    isNativeCaptureReasoningEffort(model.defaultReasoningEffort) &&
      efforts.includes(model.defaultReasoningEffort)
      ? model.defaultReasoningEffort
      : fallbackDefault
  );
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
    // Claude interactive CLI `--effort` and Codex app-server capture follow
    // the served live catalogs. Claude `ultracode` is a separate session
    // orchestration setting, not a capture effort value.
    if (providerId === "claude") {
      return claudeModels.map(capturableFromCatalog);
    }
    if (providerId === "codex") {
      return codexModels.map(capturableFromCatalog);
    }
    if (providerId === "kimi") {
      // Kimi capture follows the served Coding Plan catalog. Capture
      // materializes a temporary CLI alias and preserves the provider
      // default effort, so no reasoning choice is offered.
      return kimiClientModels.map((model) =>
        capturableModel(model.id, model.label, [], null)
      );
    }
    return [];
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
    return CAPTURE_PROVIDER_IDS;
  }

  getClientModels(providerId: string): readonly ProviderModelDescriptor[] {
    if (providerId === "kimi-client") {
      return kimiClientModels;
    }
    return CLIENT_PROVIDER_MODELS[providerId] ?? [];
  }

  getClaudeModels(): readonly ProviderModelDescriptor[] {
    return claudeModels;
  }

  // Applies the persisted or live Claude catalog; an empty list is ignored.
  setClaudeModels(models: readonly ProviderModelDescriptor[]): void {
    if (models.length > 0) {
      claudeModels = models;
    }
  }

  getCodexModels(): readonly ProviderModelDescriptor[] {
    return codexModels;
  }

  // Applies the persisted or live Codex catalog; an empty list is ignored.
  setCodexModels(models: readonly ProviderModelDescriptor[]): void {
    if (models.length > 0) {
      codexModels = models;
    }
  }

  getKimiClientModels(): readonly ProviderModelDescriptor[] {
    return kimiClientModels;
  }

  // Applies the persisted or live Kimi catalog. An empty list keeps the
  // current catalog so a broken read never removes every model.
  setKimiClientModels(models: readonly ProviderModelDescriptor[]): void {
    if (models.length > 0) {
      kimiClientModels = models;
    }
  }
}

export const providerDescriptorFacade = new ProviderDescriptorFacade();
