/**
 * Workflow Kit context delivery for Claude sessions
 * (docs/architecture/workflow-kit/WorkflowKitInstallation.md, section 5.4).
 * Core computes the recovery packet; the adapter only places it after the
 * session's system prompt, whatever the profile mode.
 */

/**
 * Tells project SessionStart hooks that Harness already delivered the
 * packet, so a native session loading `.claude/settings.json` does not
 * receive it twice.
 */
export const CLAUDE_HOST_RECOVERY_ENV = {
  HARNESS_WORKFLOW_RECOVERY: "host",
} as const;

interface ClaudePresetPrompt {
  readonly append?: string;
  readonly preset: string;
  readonly type: "preset";
}

function isPresetPrompt(value: unknown): value is ClaudePresetPrompt {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "preset"
  );
}

/**
 * Adds the workspace context to the prepared SDK options: native sessions
 * (the `claude_code` preset) get it as the preset `append`; managed and
 * legacy string prompts get it at the end. No context changes nothing.
 */
export function appendClaudeWorkspaceContext(
  options: { systemPrompt?: unknown },
  context?: string
): void {
  const text = context?.trim();
  if (!text) {
    return;
  }
  const prompt = options.systemPrompt;
  if (isPresetPrompt(prompt)) {
    options.systemPrompt = {
      ...prompt,
      append: prompt.append ? `${prompt.append}\n\n${text}` : text,
    };
    return;
  }
  options.systemPrompt =
    typeof prompt === "string" && prompt.trim() ? `${prompt}\n\n${text}` : text;
}
