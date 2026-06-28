import type { HarnessSettings } from "./settings-store-facade.js";

const CLAUDE_MODEL_ALIASES = ["sonnet", "opus", "haiku"];
const CLAUDE_THINKING_EFFORTS = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultracode",
];
const CODEX_MODEL_IDS = [
  "gpt-5.2",
  "gpt-5.3-codex-spark",
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.5",
];
const KIMI_MODEL_IDS = ["kimi-k2.7-code", "kimi-k2.7-code-highspeed"];
const GLM_OPENCODE_MODEL_IDS = [
  "zai-coding-plan/glm-5.2",
  "kimi-for-coding/k2p7",
];
const DEFAULT_GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/opencode/config.json";

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
    next.providers.codex.defaultModel = "gpt-5.4-mini";
  }
  if (!KIMI_MODEL_IDS.includes(next.providers.kimi.defaultModel)) {
    next.providers.kimi.defaultModel = "kimi-k2.7-code";
  }
  if (
    !GLM_OPENCODE_MODEL_IDS.includes(next.providers.glmOpenCode.defaultModel)
  ) {
    next.providers.glmOpenCode.defaultModel = "zai-coding-plan/glm-5.2";
  }
  if (!next.providers.glmOpenCode.configPath.trim()) {
    next.providers.glmOpenCode.configPath = DEFAULT_GLM_OPENCODE_CONFIG_PATH;
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
