import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { GlmOpenCodeProviderAdapter } from "./reference/index.js";
import {
  buildGlmOpenCodeRuntimeProfile,
  ensureGlmOpenCodeRuntimeProfile,
} from "./reference/provider/glm-opencode-runtime-profile.js";

export class GlmOpenCodeProviderFacade extends GlmOpenCodeProviderAdapter {
  constructor(
    model?: string,
    workspacePath = process.cwd(),
    providerHomePath?: string
  ) {
    super({
      workspace: {
        defaultModel: model && model !== "cli-default" ? model : undefined,
        providerHomePath:
          providerHomePath ??
          path.join(
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

  ensureWorkspaceHome(workspacePath: string): void {
    ensureGlmOpenCodeRuntimeProfile(
      buildGlmOpenCodeRuntimeProfile({
        providerHomePath: providerHomeManagerFacade.resolveProviderHome({
          providerId: "glm-opencode",
          workspacePath,
        }),
        settingsPath: workspaceSettingsPath(workspacePath),
        workspacePath,
      })
    );
  }
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

export const glmOpenCodeProviderFacade = new GlmOpenCodeProviderFacade();
