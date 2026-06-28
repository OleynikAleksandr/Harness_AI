import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT } from "./claude-workflow-system-prompt.js";

const WORKSPACE_INSTRUCTIONS_FILE = "AGENTS.md";

export function buildClaudeWorkspaceSystemPrompt(
  workspacePath: string
): string {
  const workspaceInstructions = readWorkspaceInstructions(workspacePath);
  const parts = [
    CODEAI_CLAUDE_WORKFLOW_SYSTEM_PROMPT,
    "",
    "# Harness Workspace Context",
    `Workspace path: ${workspacePath}`,
    "",
    `# Workspace ${WORKSPACE_INSTRUCTIONS_FILE}`,
  ];
  if (!workspaceInstructions) {
    return [
      ...parts,
      `${WORKSPACE_INSTRUCTIONS_FILE} was not found in the workspace at session start.`,
    ].join("\n");
  }
  return [
    ...parts,
    "The following workspace instructions are injected by Harness provider runtime and are authoritative for this session.",
    "",
    "```markdown",
    workspaceInstructions,
    "```",
  ].join("\n");
}

function readWorkspaceInstructions(workspacePath: string): string | null {
  try {
    const value = readFileSync(
      join(workspacePath, WORKSPACE_INSTRUCTIONS_FILE),
      "utf8"
    ).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}
