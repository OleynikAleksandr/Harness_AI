import type { HarnessSettings } from "./settings-store-facade.js";

const CLAUDE_MODEL_ALIASES = ["sonnet", "opus", "haiku"];
const CLAUDE_THINKING_EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const CODEX_MODEL_IDS = [
  "gpt-5.2",
  "gpt-5.3-codex-spark",
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-5.5",
];
const KIMI_MODEL_IDS = ["kimi-k2.7-code", "kimi-k2.7-code-highspeed"];

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
  if (!CODEX_MODEL_IDS.includes(next.providers.codex.defaultModel)) {
    next.providers.codex.defaultModel = "gpt-5.4-mini";
  }
  if (!KIMI_MODEL_IDS.includes(next.providers.kimi.defaultModel)) {
    next.providers.kimi.defaultModel = "kimi-k2.7-code";
  }
  return next;
}
