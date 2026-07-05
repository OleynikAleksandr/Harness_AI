import { ClaudeProviderFacade } from "../../../../provider-adapters/modules/claude-provider/src/claude-provider-facade.js";
import { CodexProviderFacade } from "../../../../provider-adapters/modules/codex-provider/src/codex-provider-facade.js";
import { GlmNativeProviderFacade } from "../../../../provider-adapters/modules/glm-native-provider/src/glm-native-provider-facade.js";
import { KimiProviderFacade } from "../../../../provider-adapters/modules/kimi-provider/src/kimi-provider-facade.js";
import { listLocalModels } from "../../../../provider-adapters/modules/local-models-client-provider/src/local-models-client-provider-facade.js";
import type { ProviderAdapter } from "../../../../provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { providerAuthStoreFacade } from "../../../../provider-home-and-auth/modules/provider-auth-store/src/provider-auth-store-facade.js";
import { providerDescriptorFacade } from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import type { ProviderId } from "../../../../provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import { providerReadinessRegistryFacade } from "../../provider-readiness-registry/src/provider-readiness-registry-facade.js";
import { globalHomeAdapterFactoryFacade } from "./global-home-adapter-factory.js";

interface ProviderLivenessCheckerDeps {
  authStore: {
    getApiKey(providerId: ProviderId): string | null;
  };
  createHomeAdapter: (
    providerId: ProviderId,
    providerHomePath: string
  ) => ProviderAdapter;
  getCapabilities: (providerId: ProviderId) => {
    requiresProviderHome: boolean;
  };
  globalHomeAdapterFactory: {
    runGlobalHomePreflight(request: {
      buildAdapter: (options: { providerHomePath: string }) => ProviderAdapter;
      providerId: string;
    }): Promise<void>;
  };
  loadLocalModels: () => Promise<string[]>;
  readinessRegistry: {
    setLiveness(
      providerId: string,
      status: "checking" | "ready" | "failed",
      message?: string
    ): void;
  };
}

export class ProviderLivenessCheckerFacade {
  private readonly deps: ProviderLivenessCheckerDeps;

  constructor(deps: Partial<ProviderLivenessCheckerDeps> = {}) {
    this.deps = {
      authStore: deps.authStore ?? providerAuthStoreFacade,
      createHomeAdapter: deps.createHomeAdapter ?? createHomeAdapter,
      getCapabilities:
        deps.getCapabilities ??
        ((providerId) => providerDescriptorFacade.getCapabilities(providerId)),
      globalHomeAdapterFactory:
        deps.globalHomeAdapterFactory ?? globalHomeAdapterFactoryFacade,
      // The live catalog reads the CONFIGURED base URL (settings + env
      // fallbacks) from the universal-client endpoint module.
      loadLocalModels: deps.loadLocalModels ?? listLocalModels,
      readinessRegistry:
        deps.readinessRegistry ?? providerReadinessRegistryFacade,
    };
  }

  async checkProviders(providerIds: readonly ProviderId[]): Promise<void> {
    for (const providerId of providerIds) {
      await this.checkProvider(providerId);
    }
  }

  async checkProvider(providerId: ProviderId): Promise<void> {
    this.deps.readinessRegistry.setLiveness(providerId, "checking");
    try {
      if (this.deps.getCapabilities(providerId).requiresProviderHome) {
        await this.deps.globalHomeAdapterFactory.runGlobalHomePreflight({
          buildAdapter: ({ providerHomePath }) =>
            this.deps.createHomeAdapter(providerId, providerHomePath),
          providerId,
        });
      } else {
        await this.checkApiProvider(providerId);
      }
      this.deps.readinessRegistry.setLiveness(providerId, "ready");
    } catch (error) {
      this.deps.readinessRegistry.setLiveness(
        providerId,
        "failed",
        livenessFailureMessage(providerId, error)
      );
    }
  }

  private async checkApiProvider(providerId: ProviderId): Promise<void> {
    if (providerId === "openrouter") {
      if (!this.deps.authStore.getApiKey(providerId)) {
        throw new Error("Add an OpenRouter API key in Provider Settings.");
      }
      return;
    }
    if (
      (providerId === "local-models" || providerId === "local-models-client") &&
      (await this.deps.loadLocalModels()).length === 0
    ) {
      throw new Error(
        "Start the local model server (LM Studio, Ollama or llama.cpp) at the configured base URL and load a model."
      );
    }
  }
}

function createHomeAdapter(
  providerId: ProviderId,
  providerHomePath: string
): ProviderAdapter {
  switch (providerId) {
    case "claude":
      return new ClaudeProviderFacade(
        undefined,
        process.cwd(),
        providerHomePath
      );
    case "codex":
      return new CodexProviderFacade({ providerHomePath });
    case "kimi":
      return new KimiProviderFacade(undefined, process.cwd(), providerHomePath);
    case "glm-native":
      return new GlmNativeProviderFacade(
        undefined,
        process.cwd(),
        providerHomePath
      );
    default:
      throw new Error(`Provider does not use a provider home: ${providerId}`);
  }
}

function livenessFailureMessage(
  providerId: ProviderId,
  error: unknown
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return `Provider ${providerId} is not ready. Check provider installation and auth.`;
}

export const providerLivenessCheckerFacade =
  new ProviderLivenessCheckerFacade();
