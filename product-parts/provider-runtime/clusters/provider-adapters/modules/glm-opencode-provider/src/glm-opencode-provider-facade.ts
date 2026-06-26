import { homedir } from "node:os";
import path from "node:path";
import { CliSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";

export class GlmOpenCodeProviderFacade extends CliSessionProviderAdapter {
  constructor(model?: string) {
    super({
      commands: ["opencode", path.join(homedir(), ".opencode", "bin", "opencode")],
      model,
      args: (prompt, selectedModel) => [
        "run",
        "--prompt",
        prompt,
        ...(selectedModel ? ["--model", selectedModel] : [])
      ]
    });
  }
}

export const glmOpenCodeProviderFacade = new GlmOpenCodeProviderFacade();
