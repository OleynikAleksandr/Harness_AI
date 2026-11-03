import { useEffect, useState } from "react";

/**
 * Kit status of a workspace and the autopilot snapshot of a session, both
 * read from Core and kept current by Core events: `workflow:status` and
 * `workflow:autopilot` carry the new values, and an idle turn (the agent may
 * have committed) asks Core for the status again.
 */
export function useWorkflowStatus(
  workspaceId: string,
  sessionId: string | null
) {
  const [status, setStatus] =
    useState<WorkflowKitOutcome<WorkflowKitStatus> | null>(null);
  const [autopilot, setAutopilot] = useState<WorkflowAutopilotSnapshot | null>(
    null
  );

  useEffect(() => {
    let current = true;
    const refresh = () => {
      window.harnessCore
        ?.getWorkflowStatus({ workspaceId })
        .then((outcome) => {
          if (current) {
            setStatus(outcome);
          }
        })
        .catch(() => undefined);
    };
    setStatus(null);
    refresh();
    const unsubscribe = window.harnessCore?.onEvent((event) => {
      if (event.type === "workflow:status") {
        if (event.workspaceId === workspaceId) {
          setStatus(event.status);
        }
      } else if (
        event.type === "session:turn-state" &&
        event.payload.state === "idle"
      ) {
        refresh();
      }
    });
    return () => {
      current = false;
      unsubscribe?.();
    };
  }, [workspaceId]);

  useEffect(() => {
    setAutopilot(null);
    if (!sessionId) {
      return;
    }
    let current = true;
    window.harnessCore
      ?.getWorkflowAutopilot({ sessionId })
      .then((result) => {
        if (current && result.ok) {
          setAutopilot(result.autopilot);
        }
      })
      .catch(() => undefined);
    const unsubscribe = window.harnessCore?.onEvent((event) => {
      if (
        event.type === "workflow:autopilot" &&
        event.sessionId === sessionId
      ) {
        setAutopilot(event);
      }
    });
    return () => {
      current = false;
      unsubscribe?.();
    };
  }, [sessionId]);

  async function setAutopilotEnabled(enabled: boolean): Promise<string | null> {
    if (!sessionId) {
      return null;
    }
    const result = await window.harnessCore?.setWorkflowAutopilot({
      enabled,
      sessionId,
    });
    if (!result) {
      return "Core runtime bridge is unavailable.";
    }
    if (!result.ok) {
      return result.message;
    }
    setAutopilot(result.autopilot);
    return null;
  }

  return { autopilot, setAutopilotEnabled, status };
}
