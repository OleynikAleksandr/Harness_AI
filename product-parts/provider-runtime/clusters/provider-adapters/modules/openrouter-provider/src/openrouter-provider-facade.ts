import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { OpenRouterProviderAdapter } from "./reference/open-router-provider-adapter.js";

export class OpenRouterProviderFacade extends OpenRouterProviderAdapter {
  constructor(model = process.env.OPENROUTER_MODEL ?? "openrouter/auto") {
    const settings = providerAuthStoreFacade.getProviderSettings("openrouter");
    super({
      apiKey: providerAuthStoreFacade.getApiKey("openrouter") ?? undefined,
      baseUrl:
        providerAuthStoreFacade.getBaseUrl("openrouter") ??
        "https://openrouter.ai/api/v1",
      defaultEndpointTag: settings.endpointTag,
      defaultModel:
        model === "openrouter-default"
          ? (process.env.OPENROUTER_MODEL ?? "openrouter/auto")
          : model,
    });
  }
}

export const openRouterProviderFacade = new OpenRouterProviderFacade();
