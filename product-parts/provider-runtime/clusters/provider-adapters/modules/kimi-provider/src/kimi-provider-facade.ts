import { homedir } from "node:os";
import path from "node:path";
import { CliSessionProviderAdapter } from "../../provider-adapter-contract/src/session-provider-adapter-helpers.js";

export class KimiProviderFacade extends CliSessionProviderAdapter {
  constructor(model?: string) {
    super({
      commands: ["kimi", path.join(homedir(), ".kimi-code", "bin", "kimi")],
      model,
      args: (prompt, selectedModel) => [
        "--prompt",
        prompt,
        ...(selectedModel && selectedModel !== "cli-default"
          ? ["--model", selectedModel]
          : [])
      ]
    });
  }
}

export const kimiProviderFacade = new KimiProviderFacade();
