import path from "node:path";
import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { GlmProviderAdapter } from "./reference/index.js";

export class GlmNativeProviderFacade extends GlmProviderAdapter {
  constructor(
    model = process.env.GLM_MODEL ?? process.env.ZAI_MODEL ?? "glm-5.2",
    workspacePath = process.cwd(),
    providerHomePath?: string
  ) {
    super({
      workspace: {
        apiKey: providerAuthStoreFacade.getApiKey("glm-native") ?? undefined,
        baseUrl:
          providerAuthStoreFacade.getBaseUrl("glm-native") ??
          "https://api.z.ai/api/coding/paas/v4",
        defaultModel: model,
        providerHomePath:
          providerHomePath ??
          path.join(
            workspacePath,
            ".harness",
            "runtime",
            "providers",
            "glm-native",
            "home"
          ),
        settingsPath: workspaceSettingsPath(workspacePath),
        workspacePath,
      },
    });
  }
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

export const glmNativeProviderFacade = new GlmNativeProviderFacade();
