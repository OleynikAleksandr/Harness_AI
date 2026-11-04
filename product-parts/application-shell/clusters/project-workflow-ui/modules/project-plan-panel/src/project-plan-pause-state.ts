import { useEffect, useState } from "react";

/**
 * The Core autopilot snapshot of a session (its `pauseState` drives the
 * plan pause button): read with `getWorkflowAutopilot` and replaced by every
 * `workflow:autopilot` event of that session. `setPaused` forwards the pause
 * to Core and resolves to the Core/Kit failure message, or null.
 */
export function useWorkflowAutopilot(sessionId: string | null) {
  const [autopilot, setAutopilot] = useState<WorkflowAutopilotSnapshot | null>(
    null
  );

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

  async function setPaused(paused: boolean): Promise<string | null> {
    if (!sessionId) {
      return null;
    }
    const result = await window.harnessCore?.setWorkflowPause({
      paused,
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

  return { autopilot, setPaused };
}
