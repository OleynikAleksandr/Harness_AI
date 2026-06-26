export type ProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "glm-native"
  | "glm-opencode"
  | "openrouter"
  | "local-models";

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  moduleId: string;
  status: "available" | "needs-settings";
}

const PROVIDERS: ProviderDescriptor[] = [
  {
    id: "claude",
    name: "Claude",
    moduleId: "claude-provider",
    status: "needs-settings"
  },
  {
    id: "codex",
    name: "Codex",
    moduleId: "codex-provider",
    status: "needs-settings"
  },
  {
    id: "kimi",
    name: "Kimi",
    moduleId: "kimi-provider",
    status: "needs-settings"
  },
  {
    id: "glm-native",
    name: "GLM Native",
    moduleId: "glm-native-provider",
    status: "needs-settings"
  },
  {
    id: "glm-opencode",
    name: "GLM OpenCode",
    moduleId: "glm-opencode-provider",
    status: "needs-settings"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    moduleId: "openrouter-provider",
    status: "needs-settings"
  },
  {
    id: "local-models",
    name: "Local Models",
    moduleId: "local-models-provider",
    status: "available"
  }
];

export class ProviderRegistryFacade {
  listProviders(): ProviderDescriptor[] {
    return PROVIDERS;
  }

  getProvider(id: ProviderId): ProviderDescriptor {
    const provider = PROVIDERS.find((item) => item.id === id);
    if (!provider) {
      throw new Error(`Unknown provider: ${id}`);
    }
    return provider;
  }
}

export const providerRegistryFacade = new ProviderRegistryFacade();
