import {
  type WorkflowHostFacade,
  workflowHostFacade,
} from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import type { RecoveryPacket } from "../../../../project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.js";
import type { CoreSession } from "./session-request-handler-types.js";

/** A slow Kit must not hold a session start for long. */
const CONTEXT_TIMEOUT_MS = 20_000;

type ContextHost = Pick<WorkflowHostFacade, "bundle" | "run">;

/**
 * Only primary user sessions get the workflow context: subagents inherit
 * their parent's task and Profile Creator sessions have their own purpose.
 */
function receivesWorkflowContext(session: CoreSession): boolean {
  return Boolean(
    session.workspacePath &&
      session.sessionKind !== "subagent" &&
      !session.sessionPurpose
  );
}

/**
 * The Workflow Kit recovery packet for a session start or resume when the
 * workspace has the Kit installed; undefined otherwise. Never throws: a
 * failing Kit leaves the session without the context.
 */
export async function resolveWorkflowWorkspaceContext(
  session: CoreSession,
  host: ContextHost = workflowHostFacade
): Promise<string | undefined> {
  const root = session.workspacePath;
  if (!(root && receivesWorkflowContext(session))) {
    return undefined;
  }
  if (host.bundle(root)?.source !== "project") {
    return undefined;
  }
  const event = session.providerSessionId ? "resume" : "startup";
  try {
    const outcome = await host.run<RecoveryPacket>(
      ["recover", "--event", event],
      { root, timeoutMs: CONTEXT_TIMEOUT_MS }
    );
    return outcome.ok && outcome.result.text.trim()
      ? outcome.result.text
      : undefined;
  } catch {
    return undefined;
  }
}
