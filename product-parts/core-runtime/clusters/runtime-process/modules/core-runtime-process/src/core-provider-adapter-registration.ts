import { ClaudeProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.js";
import { CodexProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.js";
import type { CodexReasoningEffort } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/types/index.js";
import { GlmClientProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/glm-client-provider/src/glm-client-provider-facade.js";
import { GrokProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/grok-provider/src/grok-provider-facade.js";
import { KimiClientProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/src/kimi-client-provider-facade.js";
import { LocalModelsClientProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/local-models-client-provider/src/local-models-client-provider-facade.js";
import { OpenRouterClientProviderFacade } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/openrouter-client-provider/src/openrouter-client-provider-facade.js";
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
  workspacePath: string,
  reasoningEffort?: string | null
): ProviderAdapter | null {
  switch (providerId) {
    case "claude":
      return new ClaudeProviderFacade(model, workspacePath);
    case "codex":
      return new CodexProviderFacade({
        defaultModel: model,
        defaultReasoningEffort: readCodexReasoningEffort(reasoningEffort),
        workspacePath,
      });
    case "grok":
      return new GrokProviderFacade({
        ...(model ? { defaultModel: model } : {}),
        ...(reasoningEffort ? { defaultReasoningEffort: reasoningEffort } : {}),
        workspacePath,
      });
    case "kimi-client":
      // The universal-client endpoint pins its own model (kimi-for-coding is
      // the single public id), so the selected model is intentionally not
      // passed.
      return new KimiClientProviderFacade(workspacePath);
    case "glm-client":
      // Multi-model GLM resolves the selected model and reasoning effort from
      // Core settings per turn; the adapter pins only the GLM dialect.
      return new GlmClientProviderFacade(workspacePath);
    case "openrouter-client":
      // The universal-client OpenRouter endpoint resolves the selected model,
      // base URL and endpoint tag from Core settings per turn; the adapter
      // pins only the OpenRouter dialect.
      return new OpenRouterClientProviderFacade(workspacePath);
    case "local-models-client":
      // The universal-client Local Models endpoint resolves the selected
      // model and connection from Core settings per turn; the adapter pins
      // only the local dialect.
      return new LocalModelsClientProviderFacade(workspacePath);
    default:
      return null;
  }
}

function readCodexReasoningEffort(
  value: string | null | undefined
): CodexReasoningEffort | undefined {
  switch (value) {
    case "low":
    case "medium":
    case "high":
    case "xhigh":
    case "max":
    case "ultra":
      return value;
    default:
      return;
  }
}

export function registerProviderAdapterInstance(
  providerId: ProviderId,
  model: string,
  workspacePath: string,
  reasoningEffort?: string
): void {
  const adapter = buildProviderAdapterInstance(
    providerId,
    model,
    workspacePath,
    reasoningEffort
  );
  if (adapter) {
    providerRegistryFacade.registerAdapter(providerId, adapter);
  }
}
