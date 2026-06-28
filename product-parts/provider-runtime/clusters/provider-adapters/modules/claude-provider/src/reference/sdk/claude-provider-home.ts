import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_HARNESS_CLAUDE_HOME = path.join(
  homedir(),
  ".harness-ai",
  "providers",
  "claude",
  "home"
);

type EnvironmentMap = Readonly<Record<string, string | undefined>>;

const resolveWorkspaceClaudeHome = (workspaceRoot: string): string =>
  path.join(
    workspaceRoot,
    ".harness",
    "runtime",
    "providers",
    "claude",
    "home"
  );

export const resolveClaudeProviderHome = (
  environment: EnvironmentMap = process.env
): string => {
  const explicitHome =
    environment.HARNESS_CLAUDE_HOME?.trim() ??
    environment.CODEAI_CLAUDE_HOME?.trim();
  if (explicitHome) {
    return explicitHome;
  }

  const workspaceRoot =
    environment.CLAUDE_WORKSPACE_PATH?.trim() ||
    environment.CODEX_WORKSPACE_PATH?.trim();
  if (workspaceRoot) {
    return resolveWorkspaceClaudeHome(path.resolve(workspaceRoot));
  }

  return DEFAULT_HARNESS_CLAUDE_HOME;
};

export const resolveClaudeProviderClaudeDir = (): string =>
  path.join(resolveClaudeProviderHome(), ".claude");

export const resolveClaudeProviderProjectsDir = (): string =>
  path.join(resolveClaudeProviderClaudeDir(), "projects");

export const resolveClaudeProviderProjectDir = (slug: string): string =>
  path.join(resolveClaudeProviderProjectsDir(), slug);
