import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import type { ProviderUsageLimitsRefreshRequest } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { readGlmUsageLimits } from "../../provider-adapter-contract/src/provider-usage-limit-readers.js";
import { OpenAiCompatibleSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";

export class GlmNativeProviderFacade extends OpenAiCompatibleSessionProviderAdapter {
  private readonly baseUrl: string;

  constructor(
    model = process.env.GLM_MODEL ?? process.env.ZAI_MODEL ?? "glm-5.2"
  ) {
    const baseUrl =
      providerAuthStoreFacade.getBaseUrl("glm-native") ??
      "https://api.z.ai/api/coding/paas/v4";
    const apiKey = providerAuthStoreFacade.getApiKey("glm-native");
    super({
      apiKey,
      baseUrl,
      model,
      providerId: "glm-native",
    });
    this.baseUrl = baseUrl;
  }

  async refreshUsageLimits(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> {
    const event = await readGlmUsageLimits({
      apiKey: providerAuthStoreFacade.getApiKey("glm-native"),
      baseUrl: this.baseUrl,
    });
    if (event) {
      request.broadcast(event);
    }
  }
}

export const glmNativeProviderFacade = new GlmNativeProviderFacade();
