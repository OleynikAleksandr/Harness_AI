import { ClaudeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.js";
import { CodexProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.js";
import { GlmNativeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/glm-native-provider/src/glm-native-provider-facade.js";
import { GlmOpenCodeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/src/glm-opencode-provider-facade.js";
import { KimiProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/kimi-provider-facade.js";
import { LocalModelsProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/local-models-provider/src/local-models-provider-facade.js";
import { OpenRouterProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/openrouter-provider/src/openrouter-provider-facade.js";
import {
  type ProviderId,
  providerRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

export function registerProviderAdapterInstance(
  providerId: ProviderId,
  model: string,
  workspacePath: string
): void {
  if (providerId === "claude") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new ClaudeProviderFacade(model, workspacePath)
    );
  }
  if (providerId === "codex") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new CodexProviderFacade({ defaultModel: model, workspacePath })
    );
  }
  if (providerId === "kimi") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new KimiProviderFacade(model, workspacePath)
    );
  }
  if (providerId === "glm-native") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new GlmNativeProviderFacade(model, workspacePath)
    );
  }
  if (providerId === "glm-opencode") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new GlmOpenCodeProviderFacade(model, workspacePath)
    );
  }
  if (providerId === "openrouter") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new OpenRouterProviderFacade(model ?? undefined)
    );
  }
  if (providerId === "local-models") {
    providerRegistryFacade.registerAdapter(
      providerId,
      new LocalModelsProviderFacade(model ?? undefined)
    );
  }
}
