import path from "node:path";

const PLATFORM_PACKAGE_BY_RUNTIME: Record<string, string> = {
  "darwin:arm64": "@anthropic-ai/claude-agent-sdk-darwin-arm64",
  "darwin:x64": "@anthropic-ai/claude-agent-sdk-darwin-x64",
  "linux:arm64": "@anthropic-ai/claude-agent-sdk-linux-arm64",
  "linux:x64": "@anthropic-ai/claude-agent-sdk-linux-x64",
  "win32:arm64": "@anthropic-ai/claude-agent-sdk-win32-arm64",
  "win32:x64": "@anthropic-ai/claude-agent-sdk-win32-x64",
};

export function resolveClaudeAgentSdkExecutablePath(options: {
  readonly arch: string;
  readonly moduleDirectory: string;
  readonly npmPrefix: string;
  readonly platform: string;
}): string {
  const platformPackage =
    PLATFORM_PACKAGE_BY_RUNTIME[`${options.platform}:${options.arch}`];
  if (platformPackage) {
    return path.join(
      options.moduleDirectory,
      "node_modules",
      platformPackage,
      options.platform === "win32" ? "claude.exe" : "claude"
    );
  }
  return options.platform === "win32"
    ? path.join(options.npmPrefix, "claude.cmd")
    : path.join(options.npmPrefix, "bin", "claude");
}
