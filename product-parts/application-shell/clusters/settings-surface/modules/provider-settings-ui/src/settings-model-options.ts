import type { ReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";

export type SettingsTabId =
  | "claude"
  | "codex"
  | "grok"
  | "kimi"
  | "glmClient"
  | "localModels"
  | "openRouter"
  | "profileStudio"
  | "general";

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
  { id: "profileStudio", label: "Profile Studio" },
  { id: "general", label: "General" },
];

// Static model lists for providers without a live catalog. Claude, Codex and
// Kimi model choices come from Core (`listProviderModelCatalogs`).
export const PROVIDER_MODEL_OPTIONS = {
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
