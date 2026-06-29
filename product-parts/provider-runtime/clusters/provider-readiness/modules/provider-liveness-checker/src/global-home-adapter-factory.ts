import type { ProviderAdapter } from "../../../../provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";

export interface GlobalHomeAdapterFactoryRequest {
  buildAdapter: (options: { providerHomePath: string }) => ProviderAdapter;
  providerId: string;
}

const HOME_ENV_BY_PROVIDER: Record<string, readonly string[]> = {
  claude: ["HARNESS_CLAUDE_HOME", "CODEAI_CLAUDE_HOME"],
  codex: ["CODEX_HOME"],
};

const RESTORED_ENV_BY_PROVIDER: Record<string, readonly string[]> = {
  claude: ["CLAUDE_WORKSPACE_PATH", ...HOME_ENV_BY_PROVIDER.claude],
  codex: [
    "CODEX_SETTINGS_PATH",
    "CODEX_WORKSPACE_PATH",
    ...HOME_ENV_BY_PROVIDER.codex,
  ],
};

export class GlobalHomeAdapterFactoryFacade {
  resolveGlobalProviderHome(providerId: string): string {
    return providerHomeManagerFacade.resolveProviderHome({ providerId });
  }

  async runGlobalHomePreflight(
    request: GlobalHomeAdapterFactoryRequest
  ): Promise<void> {
    const providerHomePath = this.resolveGlobalProviderHome(request.providerId);
    await withProviderHomeEnv(
      request.providerId,
      providerHomePath,
      async () => {
        const adapter = request.buildAdapter({ providerHomePath });
        await adapter.initialize?.();
      }
    );
  }
}

async function withProviderHomeEnv<T>(
  providerId: string,
  providerHomePath: string,
  action: () => Promise<T>
): Promise<T> {
  const keys = RESTORED_ENV_BY_PROVIDER[providerId] ?? [];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of HOME_ENV_BY_PROVIDER[providerId] ?? []) {
      process.env[key] = providerHomePath;
    }
    return await action();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

export const globalHomeAdapterFactoryFacade =
  new GlobalHomeAdapterFactoryFacade();
