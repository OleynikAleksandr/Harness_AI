import { homedir } from "node:os";
import path from "node:path";
import { CliSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";

export class ClaudeProviderFacade extends CliSessionProviderAdapter {
  constructor(model?: string) {
    super({
      commands: ["claude", path.join(homedir(), ".local", "bin", "claude")],
      model,
      args: (prompt, selectedModel) => [
        "--print",
        ...(selectedModel && selectedModel !== "cli-default"
          ? ["--model", selectedModel]
          : []),
        prompt
      ]
    });
  }
}

export const claudeProviderFacade = new ClaudeProviderFacade();
