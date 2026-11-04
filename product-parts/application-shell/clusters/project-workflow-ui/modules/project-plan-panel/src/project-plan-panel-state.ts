import { useEffect, useState } from "react";

/**
 * The Core plan view of a workspace: read with the `workflow-status` RPC
 * and replaced by every `workflow:status` event of that workspace. Core
 * publishes the event on Kit state changes and when an executor session
 * reports its working directory, so no renderer polling is needed.
 */
export function useProjectPlanView(
  workspaceId: string
): WorkflowPlanView | null {
  const [planView, setPlanView] = useState<WorkflowPlanView | null>(null);

  useEffect(() => {
    let current = true;
    setPlanView(null);
    window.harnessCore
      ?.getWorkflowStatus({ workspaceId })
      .then((result) => {
        if (current && "planView" in result) {
          setPlanView(result.planView);
        }
      })
      .catch(() => undefined);
    const unsubscribe = window.harnessCore?.onEvent((event) => {
      if (
        event.type === "workflow:status" &&
        event.workspaceId === workspaceId
      ) {
        setPlanView(event.planView ?? null);
      }
    });
    return () => {
      current = false;
      unsubscribe?.();
    };
  }, [workspaceId]);

  return planView;
}
