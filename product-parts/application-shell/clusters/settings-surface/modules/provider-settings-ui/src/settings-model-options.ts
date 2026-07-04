import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";

export type SettingsTabId =
  | "claude"
  | "codex"
  | "kimi"
  | "glmNative"
  | "glmOpenCode"
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
  { id: "kimi", label: "Kimi" },
  { id: "glmNative", label: "GLM" },
  { id: "glmOpenCode", label: "OpenCode" },
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
      description: "Optimized for professional work and long-running agents",
      id: "gpt-5.2",
      label: "GPT-5.2",
    },
    {
      description:
        "Ultra-fast coding model for lower-latency engineering tasks",
      id: "gpt-5.3-codex-spark",
      label: "GPT-5.3-Codex-Spark",
    },
    {
      description: "Smaller GPT-5.4 variant for faster everyday coding tasks",
      id: "gpt-5.4-mini",
      label: "GPT-5.4 Mini",
    },
    {
      description: "Best general agentic model for tasks across industries",
      id: "gpt-5.4",
      label: "GPT-5.4",
    },
    {
      description: "Best general agentic model for tasks across industries",
      id: "gpt-5.5",
      label: "GPT-5.5",
    },
  ],
  kimi: [
    {
      description: "Kimi K2.7 Code model exposed through Kimi Code ACP.",
      id: "kimi-k2.7-code",
      label: "Kimi K2.7 Code",
    },
    {
      description: "Lower-latency Kimi K2.7 coding model exposed through ACP.",
      id: "kimi-k2.7-code-highspeed",
      label: "Kimi K2.7 Code High Speed",
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
  glmNative: ["glm-5.2"],
  glmOpenCode: [
    {
      description: "Z.AI Coding Plan selector",
      id: "zai-coding-plan/glm-5.2",
      label: "GLM 5.2",
    },
    {
      description: "Kimi for Coding selector",
      id: "kimi-for-coding/k2p7",
      label: "Kimi K2.7",
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
  { label: "Ultracode", value: "ultracode" },
];

export const LANGUAGE_OPTIONS = ["en", "ru", "uk", "es", "de", "fr"] as const;
