import { homedir } from "node:os";
import path from "node:path";
import { readClaudeUsageLimits } from "../../provider-adapter-contract/src/provider-usage-limit-readers.js";
import {
  ClaudeProviderAdapter,
  type ClaudeUsageLimitsStreamPayload,
} from "./reference/index.js";

export class ClaudeProviderFacade extends ClaudeProviderAdapter {
  constructor(model?: string, workspacePath = process.cwd()) {
    const providerHome = path.join(
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
}

const claudeUsageLimitsBridge = {
  getCachedStreamPayload(): ClaudeUsageLimitsStreamPayload | null {
    return null;
  },
  async readStreamPayload(): Promise<ClaudeUsageLimitsStreamPayload | null> {
    return toClaudeUsageLimitsPayload(await readClaudeUsageLimits());
  },
};

function toClaudeUsageLimitsPayload(
  event: unknown
): ClaudeUsageLimitsStreamPayload | null {
  if (!(isRecord(event) && isRecord(event.data))) {
    return null;
  }
  const data = event.data;
  if (data.kind !== "usage_limits") {
    return null;
  }
  return {
    data: data as ClaudeUsageLimitsStreamPayload["data"],
    providerScopeKey:
      typeof data.providerScopeKey === "string"
        ? data.providerScopeKey
        : "claude:global",
    usageLimits:
      "usageLimits" in data
        ? (data.usageLimits as ClaudeUsageLimitsStreamPayload["usageLimits"])
        : null,
  };
}

function workspaceSettingsPath(workspacePath: string): string {
  return path.join(workspacePath, ".harness", "settings", "settings.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const claudeProviderFacade = new ClaudeProviderFacade();
