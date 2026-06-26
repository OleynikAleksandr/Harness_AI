import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { OpenAiCompatibleSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";

export class LocalModelsProviderFacade extends OpenAiCompatibleSessionProviderAdapter {
  constructor(
    model = process.env.HARNESS_AI_LOCAL_MODEL ??
      process.env.LMSTUDIO_MODEL ??
      "local-model-default"
  ) {
    const resolvedModel =
      model === "local-model-default"
        ? (process.env.HARNESS_AI_LOCAL_MODEL ??
          process.env.LMSTUDIO_MODEL ??
          "local-model-default")
        : model;
    super({
      apiKey: providerAuthStoreFacade.getApiKey("local-models"),
      baseUrl:
        providerAuthStoreFacade.getBaseUrl("local-models") ??
        "http://127.0.0.1:1234/v1",
      model: resolvedModel,
    });
  }
}

export const localModelsProviderFacade = new LocalModelsProviderFacade();
