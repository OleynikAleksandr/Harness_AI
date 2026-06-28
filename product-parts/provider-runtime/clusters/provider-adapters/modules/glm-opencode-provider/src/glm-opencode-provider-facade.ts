import path from "node:path";
import { GlmOpenCodeProviderAdapter } from "./reference/index.js";

export class GlmOpenCodeProviderFacade extends GlmOpenCodeProviderAdapter {
  constructor(model?: string, workspacePath = process.cwd()) {
    super({
      workspace: {
        defaultModel: model && model !== "cli-default" ? model : undefined,
        providerHomePath: path.join(
          workspacePath,
          ".harness",
          "runtime",
          "providers",
          "glm-opencode",
          "home"
        ),
        settingsPath: workspaceSettingsPath(workspacePath),
        workspacePath,
      },
    });
  }
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

export const glmOpenCodeProviderFacade = new GlmOpenCodeProviderFacade();
