import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export interface ProviderModelSetting {
  providerId: ProviderId;
  selectedModel: string;
}

const PROVIDER_MODELS: Record<ProviderId, string> = {
  claude: "claude-default",
  codex: "codex-default",
  kimi: "kimi-default",
  "glm-native": "glm-native-default",
  "glm-opencode": "glm-opencode-default",
  openrouter: "openrouter-default",
  "local-models": "local-model-default"
};

export class SettingsStoreFacade {
  getProviderModel(providerId: ProviderId): ProviderModelSetting {
    return {
      providerId,
      selectedModel: PROVIDER_MODELS[providerId]
    };
  }
}

export const settingsStoreFacade = new SettingsStoreFacade();
