import type {
  HarnessSettings,
  ReasoningEffort,
} from "./settings-store-facade.js";

const CLAUDE_MODEL_ALIASES = ["sonnet", "opus", "haiku"];
const CLAUDE_THINKING_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultracode",
];

// Reasoning effort levels each Claude alias exposes, mirroring the Claude CLI:
// Opus adds ultracode, Sonnet drops xhigh, Haiku has no effort selection.
// Lives here (not in the persistence facade) so the renderer can import it
// without pulling node:fs/os/path into the client bundle.
export const CLAUDE_REASONING_EFFORTS_BY_MODEL: Record<
  string,
  readonly ReasoningEffort[]
> = {
  opus: ["low", "medium", "high", "xhigh", "max", "ultracode"],
  sonnet: ["low", "medium", "high", "max"],
  haiku: [],
};
const CODEX_MODEL_IDS = [
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.3-codex-spark",
];
const CODEX_REASONING_DEFAULTS_BY_MODEL: Record<string, ReasoningEffort> = {
  "gpt-5.6-sol": "medium",
  "gpt-5.6-terra": "medium",
  "gpt-5.6-luna": "medium",
  "gpt-5.5": "medium",
  "gpt-5.4": "medium",
  "gpt-5.4-mini": "medium",
  "gpt-5.3-codex-spark": "high",
};
export const CODEX_REASONING_EFFORTS_BY_MODEL: Record<
  string,
  readonly ReasoningEffort[]
> = {
  "gpt-5.6-sol": ["low", "medium", "high", "xhigh", "max", "ultra"],
  "gpt-5.6-terra": ["low", "medium", "high", "xhigh", "max", "ultra"],
  "gpt-5.6-luna": ["low", "medium", "high", "xhigh", "max"],
  "gpt-5.5": ["low", "medium", "high", "xhigh"],
  "gpt-5.4": ["low", "medium", "high", "xhigh"],
  "gpt-5.4-mini": ["low", "medium", "high", "xhigh"],
  "gpt-5.3-codex-spark": ["low", "medium", "high", "xhigh"],
};
const CODEX_MODELS_WITHOUT_REASONING_SUMMARY = new Set(["gpt-5.3-codex-spark"]);
// The universal-client Kimi endpoint has a single public model id; the vendor
// rotates the backend behind it, so the setting is pinned. The retired ACP
// Kimi model catalog left with the kimi-provider retirement (2026-07-05).
const KIMI_CLIENT_MODEL_ID = "kimi-for-coding";
const GLM_CLIENT_MODEL_IDS = [
  "glm-5.2",
  "glm-5.1",
  "glm-5-turbo",
  "glm-4.7",
  "glm-4.6",
];
export function normalizeSettings(settings: HarnessSettings): HarnessSettings {
  const next = structuredClone(settings);
  if (!CLAUDE_MODEL_ALIASES.includes(next.providers.claude.defaultModel)) {
    next.providers.claude.defaultModel = "sonnet";
  }
  if (
    !CLAUDE_THINKING_EFFORTS.includes(next.providers.claude.thinking.effort)
  ) {
    next.providers.claude.thinking.effort = "medium";
  }
  if (!isRecord(next.providers.claude.thinkingByModel)) {
    next.providers.claude.thinkingByModel = {};
  }
  for (const modelId of CLAUDE_MODEL_ALIASES) {
    const effort = next.providers.claude.thinkingByModel[modelId];
    if (!CLAUDE_THINKING_EFFORTS.includes(effort)) {
      next.providers.claude.thinkingByModel[modelId] =
        next.providers.claude.thinking.effort;
    }
  }
  if (!CODEX_MODEL_IDS.includes(next.providers.codex.defaultModel)) {
    next.providers.codex.defaultModel = "gpt-5.6-sol";
  }
  if (!isRecord(next.providers.codex.reasoningByModel)) {
    next.providers.codex.reasoningByModel = {};
  }
  next.providers.codex.reasoningByModel = Object.fromEntries(
    CODEX_MODEL_IDS.flatMap((modelId) => {
      const effort = resolveCodexReasoningEffort(
        modelId,
        next.providers.codex.reasoningByModel[modelId]
      );
      return effort ? [[modelId, effort]] : [];
    })
  );
  next.providers.kimiClient.defaultModel = KIMI_CLIENT_MODEL_ID;
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

export function resolveCodexReasoningEffort(
  modelId: string,
  storedEffort: ReasoningEffort | undefined
): ReasoningEffort | null {
  const efforts = CODEX_REASONING_EFFORTS_BY_MODEL[modelId] ?? [];
  if (efforts.length === 0) {
    return null;
  }
  if (storedEffort && efforts.includes(storedEffort)) {
    return storedEffort;
  }
  const defaultEffort =
    CODEX_REASONING_DEFAULTS_BY_MODEL[modelId] ?? efforts[0];
  return efforts.includes(defaultEffort) ? defaultEffort : efforts[0];
}

export function supportsCodexReasoningSummary(modelId: string): boolean {
  return !CODEX_MODELS_WITHOUT_REASONING_SUMMARY.has(modelId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
