import { homedir } from "node:os";
import path from "node:path";
import type { ProviderUsageLimitsRefreshRequest } from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { readClaudeUsageLimits } from "../../provider-adapter-contract/src/provider-usage-limit-readers.js";
import { CliSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";

export class ClaudeProviderFacade extends CliSessionProviderAdapter {
  constructor(model?: string) {
    super({
      commands: ["claude", path.join(homedir(), ".local", "bin", "claude")],
      cwd: (workspacePath) => workspacePath,
      model,
      args: (prompt, selectedModel) => [
        "--print",
        ...(selectedModel && selectedModel !== "cli-default"
          ? ["--model", selectedModel]
          : []),
        prompt,
      ],
    });
  }

  async refreshUsageLimits(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> {
    const event = await readClaudeUsageLimits();
    if (event) {
      request.broadcast(event);
    }
  }
}

export const claudeProviderFacade = new ClaudeProviderFacade();
