import { useEffect, useState } from "react";

/**
 * Kit status of a workspace, read from Core and kept current by Core
 * events: `workflow:status` carries the new value, and an idle turn (the
 * agent may have committed) asks Core for the status again.
 */
export function useWorkflowStatus(
  workspaceId: string
): WorkflowKitOutcome<WorkflowKitStatus> | null {
  const [status, setStatus] =
    useState<WorkflowKitOutcome<WorkflowKitStatus> | null>(null);

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

  return status;
}
