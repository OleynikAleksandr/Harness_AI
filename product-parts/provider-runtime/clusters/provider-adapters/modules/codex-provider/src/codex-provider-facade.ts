import { homedir } from "node:os";
import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { CodexProviderAdapter } from "./reference/index.js";
import type { CodexReasoningEffort } from "./reference/types/index.js";

interface CodexProviderOptions {
  defaultModel?: string;
  defaultReasoningEffort?: CodexReasoningEffort;
  providerHomePath?: string;
  workspacePath?: string;
}

export class CodexProviderFacade extends CodexProviderAdapter {
  constructor(options: CodexProviderOptions = {}) {
    const workspacePath = options.workspacePath ?? process.cwd();
    const providerHome =
      options.providerHomePath ??
      path.join(
        workspacePath,
        ".harness",
        "runtime",
        "providers",
        "codex",
        "home"
      );
    process.env.CODEX_HOME = providerHome;
    process.env.CODEX_WORKSPACE_PATH = workspacePath;
    process.env.CODEX_SETTINGS_PATH = workspaceSettingsPath(workspacePath);
    super({
      environment: {
        CODEX_HOME: providerHome,
        CODEX_SETTINGS_PATH: workspaceSettingsPath(workspacePath),
        CODEX_WORKSPACE_PATH: workspacePath,
      },
      installerPaths: {
        linux: path.join(homedir(), ".harness-ai", "providers", "codex"),
        macOS: path.join(homedir(), ".harness-ai", "providers", "codex"),
        windows: path.join(homedir(), ".harness-ai", "providers", "codex"),
      },
      workspace: {
        defaultApprovalMode: "never",
        defaultModel: normalizeModel(options.defaultModel),
        defaultReasoningEffort: options.defaultReasoningEffort,
        defaultSandboxMode: "danger-full-access",
        workspacePath,
      },
    });
  }

  async ensureWorkspaceHome(workspacePath: string): Promise<void> {
    await providerHomeManagerFacade.prepareCodexHome({
      providerId: "codex",
      workspacePath,
    });
  }
}

function normalizeModel(model: string | undefined): string {
  return model && model !== "cli-default" ? model : "gpt-5.4-mini";
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

export const codexProviderFacade = new CodexProviderFacade();
