import { homedir } from "node:os";
import path from "node:path";
import { CodexProviderAdapter } from "./reference/index.js";

interface CodexProviderOptions {
  defaultModel?: string;
  workspacePath?: string;
}

export class CodexProviderFacade extends CodexProviderAdapter {
  constructor(options: CodexProviderOptions = {}) {
    const workspacePath = options.workspacePath ?? process.cwd();
    const providerHome = path.join(
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
        defaultSandboxMode: "danger-full-access",
        workspacePath,
      },
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
