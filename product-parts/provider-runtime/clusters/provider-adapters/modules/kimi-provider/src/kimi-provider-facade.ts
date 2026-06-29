import path from "node:path";
import { KimiProviderAdapter } from "./reference/index.js";

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
}

function normalizeModel(model: string | undefined): string {
  return model && model !== "cli-default" ? model : "kimi-k2.7-code";
}

export const kimiProviderFacade = new KimiProviderFacade();
