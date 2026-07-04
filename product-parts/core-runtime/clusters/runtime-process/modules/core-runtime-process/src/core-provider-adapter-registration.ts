import { ClaudeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.js";
import { CodexProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.js";
import { GlmClientProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/glm-client-provider/src/glm-client-provider-facade.js";
import { GlmNativeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/glm-native-provider/src/glm-native-provider-facade.js";
import { GlmOpenCodeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/glm-opencode-provider/src/glm-opencode-provider-facade.js";
import { KimiClientProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/src/kimi-client-provider-facade.js";
import { KimiProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/kimi-provider-facade.js";
import { LocalModelsProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/local-models-provider/src/local-models-provider-facade.js";
import { OpenRouterProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/openrouter-provider/src/openrouter-provider-facade.js";
import type { ProviderAdapter } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  type ProviderId,
  providerRegistryFacade,
} from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";

// Builds a fresh adapter instance without registering it. Used both by the
// shared registry wiring and by dedicated diagnostic runs (native request
// capture) that must not clobber an active session's registered adapter.
export function buildProviderAdapterInstance(
  providerId: ProviderId,
  model: string,
  workspacePath: string
): ProviderAdapter | null {
  switch (providerId) {
    case "claude":
      return new ClaudeProviderFacade(model, workspacePath);
    case "codex":
      return new CodexProviderFacade({ defaultModel: model, workspacePath });
    case "kimi":
      return new KimiProviderFacade(model, workspacePath);
    case "kimi-client":
      // The universal-client endpoint pins its own model (kimi-for-coding is
      // the single public id); the settings model bridge still aliases the
      // ACP kimi section, so the selected model is intentionally not passed.
      return new KimiClientProviderFacade(workspacePath);
    case "glm-client":
      // Multi-model GLM resolves the selected model and reasoning effort from
      // Core settings per turn; the adapter pins only the GLM dialect.
      return new GlmClientProviderFacade(workspacePath);
    case "glm-native":
      return new GlmNativeProviderFacade(model, workspacePath);
    case "glm-opencode":
      return new GlmOpenCodeProviderFacade(model, workspacePath);
    case "openrouter":
      return new OpenRouterProviderFacade(model ?? undefined);
    case "local-models":
      return new LocalModelsProviderFacade(model ?? undefined);
    default:
      return null;
  }
}

export function registerProviderAdapterInstance(
  providerId: ProviderId,
  model: string,
  workspacePath: string
): void {
  const adapter = buildProviderAdapterInstance(
    providerId,
    model,
    workspacePath
  );
  if (adapter) {
    providerRegistryFacade.registerAdapter(providerId, adapter);
  }
}
