import { OpenAiCompatibleSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";
import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";

export class GlmNativeProviderFacade extends OpenAiCompatibleSessionProviderAdapter {
  constructor(model = process.env.GLM_MODEL ?? process.env.ZAI_MODEL ?? "glm-5.2") {
    super({
      apiKey: providerAuthStoreFacade.getApiKey("glm-native"),
      baseUrl:
        providerAuthStoreFacade.getBaseUrl("glm-native") ??
        "https://api.z.ai/api/coding/paas/v4",
      model
    });
  }
}

export const glmNativeProviderFacade = new GlmNativeProviderFacade();
