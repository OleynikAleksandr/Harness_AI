import { LocalModelsProviderAdapter } from "./reference/local-models-provider-adapter.js";

export class LocalModelsProviderFacade extends LocalModelsProviderAdapter {
  constructor(
    model = process.env.HARNESS_AI_LOCAL_MODEL ??
      process.env.LMSTUDIO_MODEL ??
      "local-model-default"
  ) {
    if (model && model !== "local-model-default") {
      process.env.CODEAI_LMSTUDIO_DEFAULT_MODEL = model;
    }
    super();
  }
}

export const localModelsProviderFacade = new LocalModelsProviderFacade();
