import { homedir } from "node:os";
import path from "node:path";
import { providerHomeManagerFacade } from "../../../../provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { readClaudeUsageLimitsPayload } from "./claude-usage-limits-reader.js";
import { ensureClaudeProviderHomeAuthFiles } from "./reference/auth/claude-auth-home-bridge.js";
import {
  ClaudeProviderAdapter,
  type ClaudeUsageLimitsStreamPayload,
} from "./reference/index.js";

export class ClaudeProviderFacade extends ClaudeProviderAdapter {
  constructor(
    model?: string,
    workspacePath = process.cwd(),
    providerHomePath?: string
  ) {
    const providerHome =
      providerHomePath ??
      path.join(
        workspacePath,
        ".harness",
        "runtime",
        "providers",
        "claude",
        "home"
      );
    process.env.CLAUDE_WORKSPACE_PATH = workspacePath;
    process.env.HARNESS_CLAUDE_HOME = providerHome;
    process.env.CODEAI_CLAUDE_HOME = providerHome;
    super({
      installerPaths: {
        linux: path.join(
          homedir(),
          ".harness-ai",
          "providers",
          "claude",
          "sdk",
          "lib",
          "node_modules",
          "@anthropic-ai",
          "claude-agent-sdk"
        ),
        macOS: path.join(
          homedir(),
          ".harness-ai",
          "providers",
          "claude",
          "sdk",
          "lib",
          "node_modules",
          "@anthropic-ai",
          "claude-agent-sdk"
        ),
        windows: path.join(
          homedir(),
          ".harness-ai",
          "providers",
          "claude",
          "sdk",
          "node_modules",
          "@anthropic-ai",
          "claude-agent-sdk"
        ),
      },
      usageLimitsFacade: claudeUsageLimitsBridge,
      workspace: {
        claudeProjectSlug: "harness-ai",
        defaultModel: model && model !== "cli-default" ? model : "sonnet",
        settingsPath: workspaceSettingsPath(workspacePath),
        workspacePath,
      },
    });
  }

  async ensureWorkspaceHome(workspacePath: string): Promise<void> {
    await ensureClaudeProviderHomeAuthFiles(
      providerHomeManagerFacade.resolveProviderHome({
        providerId: "claude",
        workspacePath,
      })
    );
  }
}

const claudeUsageLimitsBridge = {
  getCachedStreamPayload(): ClaudeUsageLimitsStreamPayload | null {
    return null;
  },
  readStreamPayload(): Promise<ClaudeUsageLimitsStreamPayload | null> {
    return readClaudeUsageLimitsPayload();
  },
};

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

export const claudeProviderFacade = new ClaudeProviderFacade();
