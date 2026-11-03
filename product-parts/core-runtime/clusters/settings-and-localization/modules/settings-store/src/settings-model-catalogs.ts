import {
  type ProviderModelDescriptor,
  providerDescriptorFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import type { ReasoningEffort } from "./settings-store-facade.js";

// Settings model choices for the providers whose catalogs Core reads live
// (Claude SDK `supportedModels()`, Codex app-server `model/list`, Kimi
// `/coding/v1/models`). Core serves the current provider-descriptor catalogs
// with each model's own effort list and default, so Settings, normalization
// and turn options agree without a renderer-local model list.

export interface SettingsModelOption {
  readonly defaultReasoningEffort: ReasoningEffort | null;
  readonly description?: string;
  readonly id: string;
  readonly label: string;
  readonly reasoningEfforts: readonly ReasoningEffort[];
}

export interface ProviderModelCatalogs {
  readonly claude: readonly SettingsModelOption[];
  readonly codex: readonly SettingsModelOption[];
  readonly kimiClient: readonly SettingsModelOption[];
}

const SETTINGS_REASONING_EFFORTS: readonly string[] = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
];
// Without a catalog default the model starts on medium, else high (Kimi
// offers low/high/max), else its first level.
const PREFERRED_DEFAULT_EFFORTS: readonly ReasoningEffort[] = [
  "medium",
  "high",
];
// Claude 1M-context ids carry a `[1m]` suffix (`opus[1m]`). Saved ids and
// catalog ids are compared without it, so `opus`, `opus[1m]` and a catalog
// switching between them resolve to the same model.
const CONTEXT_SUFFIX_PATTERN = /\[[^\]]*\]$/u;

const isSettingsReasoningEffort = (effort: string): effort is ReasoningEffort =>
  SETTINGS_REASONING_EFFORTS.includes(effort);

function settingsModelOption(
  model: ProviderModelDescriptor
): SettingsModelOption {
  const efforts = (model.reasoningEfforts ?? []).filter(
    isSettingsReasoningEffort
  );
  const declared = efforts.find(
    (effort) => effort === model.defaultReasoningEffort
  );
  return {
    defaultReasoningEffort:
      declared ??
      PREFERRED_DEFAULT_EFFORTS.find((effort) => efforts.includes(effort)) ??
      efforts[0] ??
      null,
    ...(model.description ? { description: model.description } : {}),
    id: model.id,
    label: model.label,
    reasoningEfforts: efforts,
  };
}

export function listProviderModelCatalogs(): ProviderModelCatalogs {
  return {
    claude: providerDescriptorFacade.getClaudeModels().map(settingsModelOption),
    codex: providerDescriptorFacade.getCodexModels().map(settingsModelOption),
    kimiClient: providerDescriptorFacade
      .getKimiClientModels()
      .map(settingsModelOption),
  };
}

// The catalog id a stored model id stands for: itself, or the catalog model
// whose id matches it once both drop the context suffix.
function catalogModelId(
  models: readonly SettingsModelOption[],
  storedId: string
): string | null {
  if (models.some((model) => model.id === storedId)) {
    return storedId;
  }
  const storedBase = withoutContextSuffix(storedId);
  return (
    models.find((model) => withoutContextSuffix(model.id) === storedBase)?.id ??
    null
  );
}

// Stored default model resolved against the catalog; unknown ids fall back to
// the preferred id when the catalog has it, else to the first catalog model.
export function normalizeCatalogDefaultModel(
  models: readonly SettingsModelOption[],
  storedId: unknown,
  preferredId: string | null
): string {
  const stored =
    typeof storedId === "string" ? catalogModelId(models, storedId) : null;
  if (stored) {
    return stored;
  }
  if (preferredId && models.some((model) => model.id === preferredId)) {
    return preferredId;
  }
  return models[0]?.id ?? preferredId ?? "";
}

// One effort per catalog model that offers effort selection: the stored
// level (also under an id differing only by the context suffix) when the model supports it, else the
// model default. Entries for models outside the catalog are dropped.
export function normalizeCatalogEfforts(
  models: readonly SettingsModelOption[],
  stored: unknown
): Record<string, ReasoningEffort> {
  const storedById: Record<string, unknown> = isRecord(stored) ? stored : {};
  return Object.fromEntries(
    models.flatMap((model) => {
      if (!model.defaultReasoningEffort) {
        return [];
      }
      const base = withoutContextSuffix(model.id);
      const configured =
        storedById[model.id] ??
        Object.entries(storedById).find(
          ([storedId]) => withoutContextSuffix(storedId) === base
        )?.[1];
      return [
        [
          model.id,
          model.reasoningEfforts.find((effort) => effort === configured) ??
            model.defaultReasoningEffort,
        ],
      ];
    })
  );
}

function withoutContextSuffix(id: string): string {
  return id.replace(CONTEXT_SUFFIX_PATTERN, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
