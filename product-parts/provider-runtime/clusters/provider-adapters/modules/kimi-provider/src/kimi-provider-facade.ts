import { homedir } from "node:os";
import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import type { ProviderUsageLimitsRefreshRequest } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { readKimiUsageLimits } from "../../provider-adapter-contract/src/provider-usage-limit-readers.js";
import { CliSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";
import { buildKimiModelEnvironment } from "./kimi-model-env.js";

export class KimiProviderFacade extends CliSessionProviderAdapter {
  constructor(model?: string) {
    super({
      commands: ["kimi", path.join(homedir(), ".kimi-code", "bin", "kimi")],
      cwd: (workspacePath) =>
        workspacePath ??
        providerHomeManagerFacade.resolveProviderHome({
          providerId: "kimi",
          workspacePath,
        }),
      env: buildKimiModelEnvironment,
      model,
      args: (prompt) => ["--prompt", prompt, "--output-format", "stream-json"],
      outputParser: "kimi-stream-json",
    });
  }

  async refreshUsageLimits(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> {
    const event = await readKimiUsageLimits();
    if (event) {
      request.broadcast(event);
    }
  }
}

export const kimiProviderFacade = new KimiProviderFacade();
