import { homedir } from "node:os";
import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { providerDescriptorFacade } from "../../../../provider-registry/modules/provider-descriptor/src/provider-descriptor-facade.js";
import { CodexProviderAdapter } from "./reference/index.js";
import type { CodexReasoningEffort } from "./reference/types/index.js";

export { refreshCodexModelCatalog } from "./codex-model-catalog.js";

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

// Legacy callers without a model start on the first model of the served
// Codex catalog (live `model/list` order, catalog default first).
function normalizeModel(model: string | undefined): string {
  return model && model !== "cli-default"
    ? model
    : (providerDescriptorFacade.getCodexModels()[0]?.id ?? "gpt-6.1-sol");
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

export const codexProviderFacade = new CodexProviderFacade();
