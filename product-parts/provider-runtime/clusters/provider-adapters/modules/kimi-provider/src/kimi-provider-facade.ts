import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { KimiProviderAdapter } from "./reference/index.js";
import { materializeKimiManagedAgentProfile } from "./reference/provider/kimi-managed-agent-profile.js";

export class KimiProviderFacade extends KimiProviderAdapter {
  constructor(
    model?: string,
    workspacePath = process.cwd(),
    providerHomePath?: string
  ) {
    super({
      workspace: {
        defaultModel: normalizeModel(model),
        providerHomePath:
          providerHomePath ??
          path.join(
            workspacePath,
            ".harness",
            "runtime",
            "providers",
            "kimi",
            "home"
          ),
        thinkingEnabled: true,
        workspacePath,
      },
    });
  }

  async ensureWorkspaceHome(workspacePath: string): Promise<void> {
    await materializeKimiManagedAgentProfile(
      providerHomeManagerFacade.resolveProviderHome({
        providerId: "kimi",
        workspacePath,
      })
    );
  }
}

function normalizeModel(model: string | undefined): string {
  return model && model !== "cli-default" ? model : "kimi-k2.7-code";
}

export const kimiProviderFacade = new KimiProviderFacade();
