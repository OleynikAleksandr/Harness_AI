import type {
  KitFailure,
  WorkflowHostFacade,
} from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import type { PauseState } from "../../../../project-workflow/modules/workflow-kit/src/workflow-kit-facade.js";
import type {
  SessionWorkflowAutopilot,
  WorkflowAutopilotSnapshot,
} from "../../../../session-runtime/modules/session-request-handler/src/session-workflow-autopilot.js";

/**
 * Kit notes of the plan panel button. The click is the user's action, so
 * the note names the button in the user's place.
 */
const PAUSE_NOTES = {
  off: "Continued from the Harness plan panel",
  on: "Paused from the Harness plan panel",
} as const;

export interface WorkflowPauseDependencies {
  /** The Core autopilot: re-reads the pause and continues when lifted. */
  autopilot: Pick<SessionWorkflowAutopilot, "refreshPause">;
  host: Pick<WorkflowHostFacade, "run">;
  /** Core sessions; the pause applies to the session's workspace. */
  sessions: {
    get: (sessionId: string) => { workspacePath?: string } | undefined;
  };
}

export type WorkflowPauseResult =
  | KitFailure
  | { autopilot: WorkflowAutopilotSnapshot; ok: true };

function failure(message: string, code: string): KitFailure {
  return { code, message, nextAction: null, ok: false };
}

/**
 * `workflow-pause-set {sessionId, paused}`: the Kit `pause:set --on|--off`
 * in the session's workspace, then `refreshPause` of the session autopilot
 * (it publishes `workflow:autopilot` with `pauseState`; lifting the pause
 * continues an idle session at once). A pause does not interrupt the
 * current agent turn. Kit failures are returned as their envelope.
 */
export async function setWorkflowPause(
  dependencies: WorkflowPauseDependencies,
  sessionId: string,
  paused: unknown
): Promise<WorkflowPauseResult> {
  if (!sessionId || typeof paused !== "boolean") {
    return failure(
      "sessionId and a boolean paused are required.",
      "INVALID_REQUEST"
    );
  }
  const session = dependencies.sessions.get(sessionId);
  if (!session) {
    return failure("Unknown session.", "UNKNOWN_SESSION");
  }
  if (!session.workspacePath) {
    return failure("The session has no project.", "NO_WORKSPACE");
  }
  const outcome = await dependencies.host.run<PauseState>(
    [
      "pause:set",
      paused ? "--on" : "--off",
      "--note",
      paused ? PAUSE_NOTES.on : PAUSE_NOTES.off,
    ],
    { root: session.workspacePath }
  );
  if (!outcome.ok) {
    return outcome;
  }
  return {
    autopilot: await dependencies.autopilot.refreshPause(sessionId),
    ok: true,
  };
}
