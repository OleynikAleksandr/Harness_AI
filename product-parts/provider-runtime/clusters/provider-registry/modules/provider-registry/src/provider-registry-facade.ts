import type { ProviderAdapter } from "../../../../provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { providerReadinessRegistryFacade } from "../../../../provider-readiness/modules/provider-readiness-registry/src/provider-readiness-registry-facade.js";
import {
  type ProviderCapabilities,
  providerDescriptorFacade,
} from "../../provider-descriptor/src/provider-descriptor-facade.js";

export type ProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "kimi-client"
  | "glm-native"
  | "glm-opencode"
  | "openrouter"
  | "local-models";

// Internal providers are bound in the registry (descriptor, adapter slot)
// but hidden from the visible picker until their visibility switch task.
export type ProviderVisibility = "internal" | "visible";

export interface ProviderDescriptor {
  adapterStatus: "registered" | "unregistered";
  capabilities: ProviderCapabilities;
  id: ProviderId;
  moduleId: string;
  name: string;
  readinessMessage?: string;
  readinessStatus: "checking" | "preparing" | "ready" | "failed";
  status: "available" | "needs-settings";
  visibility: ProviderVisibility;
}

export interface ProviderInvocationProfile {
  description: string;
  id: string;
  label: string;
  mode: "managed" | "native";
}

type ProviderBaseDescriptor = Omit<
  ProviderDescriptor,
  "adapterStatus" | "capabilities" | "readinessMessage" | "readinessStatus"
>;

const PROVIDERS: ProviderBaseDescriptor[] = [
  {
    id: "claude",
    name: "Claude",
    moduleId: "claude-provider",
    status: "needs-settings",
    visibility: "visible",
  },
  {
    id: "codex",
    name: "Codex",
    moduleId: "codex-provider",
    status: "needs-settings",
    visibility: "visible",
  },
  {
    id: "kimi",
    name: "Kimi",
    moduleId: "kimi-provider",
    status: "needs-settings",
    visibility: "visible",
  },
  {
    // Universal-client Kimi endpoint. Internal while the ACP kimi provider
    // serves the visible picker; the visibility switch flips the visible
    // kimi to this endpoint. Never two Kimi entries in the picker at once.
    id: "kimi-client",
    name: "Kimi",
    moduleId: "kimi-client-provider",
    status: "needs-settings",
    visibility: "internal",
  },
  {
    id: "glm-native",
    name: "GLM Native",
    moduleId: "glm-native-provider",
    status: "needs-settings",
    visibility: "visible",
  },
  {
    id: "glm-opencode",
    name: "OpenCode",
    moduleId: "glm-opencode-provider",
    status: "needs-settings",
    visibility: "visible",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    moduleId: "openrouter-provider",
    status: "needs-settings",
    visibility: "visible",
  },
  {
    id: "local-models",
    name: "Local Models",
    moduleId: "local-models-provider",
    status: "available",
    visibility: "visible",
  },
];

const INVOCATION_PROFILES: ProviderInvocationProfile[] = [
  {
    description: "Vendor CLI or SDK behavior with the raw user request.",
    id: "native-raw",
    label: "Native · Raw",
    mode: "native",
  },
  {
    description: "Visualizer-only option reserved for normalizer selection.",
    id: "managed-auto-normalizer",
    label: "Auto Normalizer",
    mode: "managed",
  },
  {
    description:
      "Visualizer-only option reserved for an explicit managed profile.",
    id: "managed-user-profile",
    label: "User Profile",
    mode: "managed",
  },
];

export class ProviderRegistryFacade {
  private readonly adapters = new Map<ProviderId, ProviderAdapter>();
  private readinessWorkspaceId = "";

  // The visible picker snapshot: internal providers are excluded here but
  // stay resolvable through getProvider/getAdapter for Core session routing.
  listProviders(): ProviderDescriptor[] {
    return PROVIDERS.filter(
      (provider) => provider.visibility === "visible"
    ).map((provider) => this.enrichDescriptor(provider));
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

  listInvocationProfiles(): ProviderInvocationProfile[] {
    return INVOCATION_PROFILES.map((profile) => ({ ...profile }));
  }

  registerAdapter(id: ProviderId, adapter: ProviderAdapter): void {
    this.adapters.set(id, adapter);
  }

  clearAdapters(): void {
    this.adapters.clear();
  }

  setReadinessWorkspace(workspaceId: string): void {
    this.readinessWorkspaceId = workspaceId;
  }

  private enrichDescriptor(
    provider: ProviderBaseDescriptor
  ): ProviderDescriptor {
    const readiness = providerReadinessRegistryFacade.combine(
      provider.id,
      this.readinessWorkspaceId
    );
    return {
      ...provider,
      adapterStatus: this.adapters.has(provider.id)
        ? "registered"
        : "unregistered",
      capabilities: providerDescriptorFacade.getCapabilities(provider.id),
      ...readiness,
    };
  }
}

export const providerRegistryFacade = new ProviderRegistryFacade();
