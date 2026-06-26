import { OpenAiCompatibleSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";
import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";

export class OpenRouterProviderFacade extends OpenAiCompatibleSessionProviderAdapter {
  constructor(model = process.env.OPENROUTER_MODEL ?? "openrouter/auto") {
    const resolvedModel =
      model === "openrouter-default"
        ? (process.env.OPENROUTER_MODEL ?? "openrouter/auto")
        : model;
    super({
      apiKey: providerAuthStoreFacade.getApiKey("openrouter"),
      baseUrl:
        providerAuthStoreFacade.getBaseUrl("openrouter") ??
        "https://openrouter.ai/api/v1",
      model: resolvedModel
    });
  }
}

export const openRouterProviderFacade = new OpenRouterProviderFacade();
