import type { ProviderSessionStartOptions } from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

/**
 * Workflow Kit context delivery for Codex threads
 * (docs/architecture/workflow-kit/WorkflowKitInstallation.md, section 5.4).
 * Core computes the recovery packet; it travels as `developerInstructions`
 * on thread/start and thread/resume, next to the profile's
 * `baseInstructions`, so it never replaces the built-in or managed prompt.
 */

/**
 * Tells the project hook in `.codex/hooks.json` that Harness already
 * delivered the packet; hooks inherit it from the app-server process.
 */
export const CODEX_HOST_RECOVERY_ENV = {
  HARNESS_WORKFLOW_RECOVERY: "host",
} as const;

/** Extra thread/start (and thread/resume) params for the workspace context. */
export function buildCodexWorkspaceContextParams(
  options?: ProviderSessionStartOptions
): Record<string, unknown> {
  const context = options?.workspaceContext?.trim();
  return context ? { developerInstructions: context } : {};
}
