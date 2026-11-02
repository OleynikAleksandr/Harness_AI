import {
  listProviderModelCatalogs,
  normalizeCatalogDefaultModel,
  normalizeCatalogEfforts,
} from "./settings-model-catalogs.js";
import type {
  HarnessSettings,
  ProfileCreatorAgentOption,
  ReasoningEffort,
} from "./settings-store-facade.js";

export const PROFILE_CREATOR_AGENT_OPTIONS: readonly ProfileCreatorAgentOption[] =
  [
    {
      id: "codex",
      label: "Codex Profile Creator Agent",
      model: "gpt-5.6-sol",
      reasoningEffort: "high",
    },
  ];

const PROFILE_CREATOR_AGENT_PROVIDER_IDS: readonly string[] =
  PROFILE_CREATOR_AGENT_OPTIONS.map((option) => option.id);

const CLAUDE_THINKING_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultracode",
];

const GROK_MODEL_IDS = ["grok-4.5", "grok-composer-2.5-fast"];
export const GROK_REASONING_EFFORTS_BY_MODEL: Record<
  string,
  readonly ReasoningEffort[]
> = {
  "grok-4.5": ["high", "medium", "low"],
  "grok-composer-2.5-fast": [],
};
const CODEX_MODELS_WITHOUT_REASONING_SUMMARY = new Set(["gpt-5.3-codex-spark"]);
// Claude, Codex and Kimi models, efforts and defaults come from the live
// provider catalogs Core serves (`settings-model-catalogs`); Sonnet and
// kimi-for-coding stay the preferred defaults while their catalogs list them.
const GLM_CLIENT_MODEL_IDS = [
  "glm-5.2",
  "glm-5.1",
  "glm-5-turbo",
  "glm-4.7",
  "glm-4.6",
];
export function normalizeSettings(settings: HarnessSettings): HarnessSettings {
  const next = structuredClone(settings);
  if (
    !PROFILE_CREATOR_AGENT_PROVIDER_IDS.includes(
      next.profileStudio.defaultCreatorAgentProviderId
    )
  ) {
    next.profileStudio.defaultCreatorAgentProviderId = "codex";
  }
  const catalogs = listProviderModelCatalogs();
  next.providers.claude.defaultModel = normalizeCatalogDefaultModel(
    catalogs.claude,
    next.providers.claude.defaultModel,
    "sonnet"
  );
  if (
    !CLAUDE_THINKING_EFFORTS.includes(next.providers.claude.thinking.effort)
  ) {
    next.providers.claude.thinking.effort = "medium";
  }
  next.providers.claude.thinkingByModel = normalizeCatalogEfforts(
    catalogs.claude,
    next.providers.claude.thinkingByModel
  );
  next.providers.codex.defaultModel = normalizeCatalogDefaultModel(
    catalogs.codex,
    next.providers.codex.defaultModel,
    null
  );
  next.providers.codex.reasoningByModel = normalizeCatalogEfforts(
    catalogs.codex,
    next.providers.codex.reasoningByModel
  );
  if (!GROK_MODEL_IDS.includes(next.providers.grok.defaultModel)) {
    next.providers.grok.defaultModel = "grok-4.5";
  }
  if (!isRecord(next.providers.grok.reasoningByModel)) {
    next.providers.grok.reasoningByModel = {};
  }
  next.providers.grok.reasoningByModel = Object.fromEntries(
    GROK_MODEL_IDS.flatMap((modelId) => {
      const efforts = GROK_REASONING_EFFORTS_BY_MODEL[modelId] ?? [];
      if (efforts.length === 0) {
        return [];
      }
      const configured = next.providers.grok.reasoningByModel[modelId];
      return [
        [modelId, efforts.includes(configured) ? configured : efforts[0]],
      ];
    })
  );
  next.providers.kimiClient.defaultModel = normalizeCatalogDefaultModel(
    catalogs.kimiClient,
    next.providers.kimiClient.defaultModel,
    "kimi-for-coding"
  );
  next.providers.kimiClient.reasoningByModel = normalizeCatalogEfforts(
    catalogs.kimiClient,
    next.providers.kimiClient.reasoningByModel
  );
  if (!GLM_CLIENT_MODEL_IDS.includes(next.providers.glmClient.defaultModel)) {
    next.providers.glmClient.defaultModel = "glm-5.2";
  }
  if (
    !CLAUDE_THINKING_EFFORTS.includes(next.providers.glmClient.reasoningEffort)
  ) {
    next.providers.glmClient.reasoningEffort = "max";
  }
  next.providers.localModels.baseUrl = normalizeLocalBaseUrl(
    next.providers.localModels.baseUrl
  );
  next.providers.localModels.contextLengthByModel =
    normalizeContextLengthByModel(
      next.providers.localModels.contextLengthByModel
    );
  return next;
}

const LOCAL_MODELS_DEFAULT_BASE_URL = "http://127.0.0.1:1234";
const TRAILING_SLASHES_PATTERN = /\/+$/u;
const HTTP_URL_PATTERN = /^https?:\/\/.+/u;

// Local Models base URL: keep http(s) URLs only and drop trailing slashes so
// endpoint paths concatenate cleanly; anything else falls back to the default.
function normalizeLocalBaseUrl(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const withoutSlashes = trimmed.replace(TRAILING_SLASHES_PATTERN, "");
  return HTTP_URL_PATTERN.test(withoutSlashes)
    ? withoutSlashes
    : LOCAL_MODELS_DEFAULT_BASE_URL;
}

// Per-model context wishes: keep non-negative integer entries only (0 =
// server default); junk values and non-record shapes reset structurally.
function normalizeContextLengthByModel(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, contextLength]) =>
        typeof contextLength === "number" &&
        Number.isInteger(contextLength) &&
        contextLength >= 0
    )
  ) as Record<string, number>;
}

export function supportsCodexReasoningSummary(modelId: string): boolean {
  return !CODEX_MODELS_WITHOUT_REASONING_SUMMARY.has(modelId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
