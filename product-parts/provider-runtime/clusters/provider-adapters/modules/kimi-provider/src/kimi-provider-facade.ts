import { homedir } from "node:os";
import path from "node:path";
import type { ProviderUsageLimitsRefreshRequest } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { readKimiUsageLimits } from "../../provider-adapter-contract/src/provider-usage-limit-readers.js";
import { CliSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";
import { buildKimiModelEnvironment } from "./kimi-model-env.js";

export class KimiProviderFacade extends CliSessionProviderAdapter {
  constructor(model?: string) {
    super({
      commands: ["kimi", path.join(homedir(), ".kimi-code", "bin", "kimi")],
      env: buildKimiModelEnvironment,
      model,
      args: (prompt, selectedModel) => [
        "--prompt",
        prompt,
        ...(selectedModel && selectedModel !== "cli-default"
          ? ["--model", selectedModel]
          : []),
      ],
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
