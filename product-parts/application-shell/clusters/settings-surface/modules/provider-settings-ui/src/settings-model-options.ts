import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";

export type SettingsTabId =
  | "claude"
  | "codex"
  | "kimi"
  | "glmNative"
  | "glmOpenCode"
  | "localModels"
  | "openRouter"
  | "general";

export const SETTINGS_TABS: ReadonlyArray<{
  id: SettingsTabId;
  label: string;
}> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "kimi", label: "Kimi" },
  { id: "glmNative", label: "GLM" },
  { id: "glmOpenCode", label: "OpenCode" },
  { id: "localModels", label: "Local Models" },
  { id: "openRouter", label: "OpenRouter" },
  { id: "general", label: "General" }
];

export const PROVIDER_MODEL_OPTIONS = {
  claude: ["cli-default", "sonnet", "opus"],
  codex: ["cli-default", "gpt-5.4", "gpt-5.4-mini"],
  kimi: ["cli-default", "kimi-k2.7-code", "kimi-k2.7-code-highspeed"],
  glmNative: ["glm-5.2"],
  glmOpenCode: ["zai-coding-plan/glm-5.2", "kimi-for-coding/k2p7"]
} as const;

export const REASONING_EFFORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: ReasoningEffort;
}> = [
  { label: "Off", value: "off" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Max", value: "max" }
];

export const LANGUAGE_OPTIONS = ["en", "ru", "uk", "es", "de", "fr"] as const;
