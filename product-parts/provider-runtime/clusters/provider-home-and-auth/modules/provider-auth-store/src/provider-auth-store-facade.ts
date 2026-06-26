import type { ProviderId } from "../../../../provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export class ProviderAuthStoreFacade {
  getApiKey(providerId: ProviderId): string | null {
    const env = process.env;
    const keys: Partial<Record<ProviderId, string[]>> = {
      "glm-native": ["GLM_API_KEY", "ZAI_API_KEY"],
      "local-models": ["HARNESS_AI_LOCAL_API_KEY", "LMSTUDIO_API_KEY"],
      openrouter: ["OPENROUTER_API_KEY"]
    };
    for (const key of keys[providerId] ?? []) {
      const value = env[key]?.trim();
      if (value) {
        return value;
      }
    }
    return null;
  }

  getBaseUrl(providerId: ProviderId): string | null {
    const env = process.env;
    const urls: Partial<Record<ProviderId, string[]>> = {
      "glm-native": ["GLM_BASE_URL", "ZAI_BASE_URL"],
      "local-models": ["HARNESS_AI_LOCAL_MODELS_BASE_URL", "LMSTUDIO_BASE_URL"],
      openrouter: ["OPENROUTER_BASE_URL"]
    };
    for (const key of urls[providerId] ?? []) {
      const value = env[key]?.trim();
      if (value) {
        return value;
      }
    }
    return null;
  }
}

export const providerAuthStoreFacade = new ProviderAuthStoreFacade();
