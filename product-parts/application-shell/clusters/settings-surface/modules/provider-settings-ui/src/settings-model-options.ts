import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";

export type SettingsTabId =
  | "claude"
  | "codex"
  | "grok"
  | "kimi"
  | "glmClient"
  | "localModels"
  | "openRouter"
  | "general"
  | "profileCreator";

export const SETTINGS_TABS: ReadonlyArray<{
  id: SettingsTabId;
  label: string;
}> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "grok", label: "Grok" },
  { id: "kimi", label: "Kimi" },
  { id: "glmClient", label: "GLM" },
  { id: "localModels", label: "Local Models" },
  { id: "openRouter", label: "OpenRouter" },
  { id: "general", label: "General" },
  { id: "profileCreator", label: "Profile Creator" },
];

export const PROVIDER_MODEL_OPTIONS = {
  claude: [
    {
      description: "Best fit for everyday tasks.",
      id: "sonnet",
      label: "Sonnet",
    },
    {
      description: "Most powerful option for complex agentic workloads.",
      id: "opus",
      label: "Opus",
    },
    {
      description: "Fastest alias for quick answers and prototyping.",
      id: "haiku",
      label: "Haiku",
    },
  ],
  codex: [
    {
      description: "Latest frontier agentic coding model",
      id: "gpt-5.6-sol",
      label: "GPT-5.6 Sol",
    },
    {
      description: "Balanced agentic coding model for everyday work",
      id: "gpt-5.6-terra",
      label: "GPT-5.6 Terra",
    },
    {
      description: "Fast and affordable agentic coding model",
      id: "gpt-5.6-luna",
      label: "GPT-5.6 Luna",
    },
    {
      description:
        "Frontier model for complex coding, research, and real-world work",
      id: "gpt-5.5",
      label: "GPT-5.5",
    },
    {
      description: "Strong model for everyday coding",
      id: "gpt-5.4",
      label: "GPT-5.4",
    },
    {
      description:
        "Small, fast, and cost-efficient model for simpler coding tasks",
      id: "gpt-5.4-mini",
      label: "GPT-5.4 Mini",
    },
    {
      description: "Ultra-fast coding model",
      id: "gpt-5.3-codex-spark",
      label: "GPT-5.3-Codex-Spark",
    },
  ],
  grok: [
    {
      description:
        "xAI's frontier model with a 500K native context window and adjustable reasoning effort.",
      id: "grok-4.5",
      label: "Grok 4.5",
    },
    {
      description:
        "Fast coding model with a 200K native context window and provider-managed reasoning.",
      id: "grok-composer-2.5-fast",
      label: "Composer 2.5 Fast",
    },
  ],
  glmClient: [
    {
      description:
        "Default GLM coding model for the Z.ai Coding Plan endpoint.",
      id: "glm-5.2",
      label: "GLM 5.2",
    },
    {
      description:
        "Previous-generation GLM coding model for compatibility checks.",
      id: "glm-5.1",
      label: "GLM 5.1",
    },
    {
      description: "Lower-latency GLM coding model.",
      id: "glm-5-turbo",
      label: "GLM 5 Turbo",
    },
    {
      description: "GLM 4.7 coding model on the Z.ai endpoint.",
      id: "glm-4.7",
      label: "GLM 4.7",
    },
    {
      description: "GLM 4.6 coding model on the Z.ai endpoint.",
      id: "glm-4.6",
      label: "GLM 4.6",
    },
  ],
} as const;

export const REASONING_EFFORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: ReasoningEffort;
}> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "x-High", value: "xhigh" },
  { label: "Max", value: "max" },
  { label: "Ultra", value: "ultra" },
  { label: "Ultracode", value: "ultracode" },
];

export const LANGUAGE_OPTIONS = ["en", "ru", "uk", "es", "de", "fr"] as const;
