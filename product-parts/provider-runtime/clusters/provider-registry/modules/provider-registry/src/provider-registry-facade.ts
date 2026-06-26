import type { ProviderAdapter } from "../../../../provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  type ProviderCapabilities,
  providerDescriptorFacade,
} from "../../provider-descriptor/src/provider-descriptor-facade.js";

export type ProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "glm-native"
  | "glm-opencode"
  | "openrouter"
  | "local-models";

export interface ProviderDescriptor {
  adapterStatus: "registered" | "unregistered";
  capabilities: ProviderCapabilities;
  id: ProviderId;
  moduleId: string;
  name: string;
  status: "available" | "needs-settings";
}

type ProviderBaseDescriptor = Omit<
  ProviderDescriptor,
  "adapterStatus" | "capabilities"
>;

const PROVIDERS: ProviderBaseDescriptor[] = [
  {
    id: "claude",
    name: "Claude",
    moduleId: "claude-provider",
    status: "needs-settings",
  },
  {
    id: "codex",
    name: "Codex",
    moduleId: "codex-provider",
    status: "needs-settings",
  },
  {
    id: "kimi",
    name: "Kimi",
    moduleId: "kimi-provider",
    status: "needs-settings",
  },
  {
    id: "glm-native",
    name: "GLM Native",
    moduleId: "glm-native-provider",
    status: "needs-settings",
  },
  {
    id: "glm-opencode",
    name: "GLM OpenCode",
    moduleId: "glm-opencode-provider",
    status: "needs-settings",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    moduleId: "openrouter-provider",
    status: "needs-settings",
  },
  {
    id: "local-models",
    name: "Local Models",
    moduleId: "local-models-provider",
    status: "available",
  },
];

export class ProviderRegistryFacade {
  private readonly adapters = new Map<ProviderId, ProviderAdapter>();

  listProviders(): ProviderDescriptor[] {
    return PROVIDERS.map((provider) => this.enrichDescriptor(provider));
  }

  getProvider(id: ProviderId): ProviderDescriptor {
    const provider = PROVIDERS.find((item) => item.id === id);
    if (!provider) {
      throw new Error(`Unknown provider: ${id}`);
    }
    return this.enrichDescriptor(provider);
  }

  getAdapter(id: ProviderId): ProviderAdapter | null {
    return this.adapters.get(id) ?? null;
  }

  registerAdapter(id: ProviderId, adapter: ProviderAdapter): void {
    this.adapters.set(id, adapter);
  }

  clearAdapters(): void {
    this.adapters.clear();
  }

  private enrichDescriptor(
    provider: ProviderBaseDescriptor
  ): ProviderDescriptor {
    return {
      ...provider,
      adapterStatus: this.adapters.has(provider.id)
        ? "registered"
        : "unregistered",
      capabilities: providerDescriptorFacade.getCapabilities(provider.id),
    };
  }
}

export const providerRegistryFacade = new ProviderRegistryFacade();
