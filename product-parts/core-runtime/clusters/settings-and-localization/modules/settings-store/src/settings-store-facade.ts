import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export interface ProviderModelSetting {
  providerId: ProviderId;
  selectedModel: string;
}

const PROVIDER_MODELS: Record<ProviderId, string> = {
  claude: "cli-default",
  codex: "cli-default",
  kimi: "cli-default",
  "glm-native": "glm-5.2",
  "glm-opencode": "zai-coding-plan/glm-5.2",
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
