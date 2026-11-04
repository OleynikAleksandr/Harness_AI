import { useEffect, useState } from "react";

/** `choose` result when the Core bridge is missing; the card localizes it. */
export const BRIDGE_UNAVAILABLE = "core.bridge.unavailable";

/**
 * The execution mode card of a workspace, read from Core and replaced by
 * every `workflow:mode-choice` event of that workspace. `choose` forwards
 * the clicked option; Core records it and answers with the new card.
 */
export function useExecutionModeCard(workspaceId: string) {
  const [card, setCard] = useState<WorkflowModeChoiceCard | null>(null);

  useEffect(() => {
    let current = true;
    setCard(null);
    window.harnessCore
      ?.getWorkflowModeChoice({ workspaceId })
      .then((result) => {
        if (current && result.ok) {
          setCard(result.card);
        }
      })
      .catch(() => undefined);
    const unsubscribe = window.harnessCore?.onEvent((event) => {
      if (
        event.type === "workflow:mode-choice" &&
        event.workspaceId === workspaceId
      ) {
        setCard(event.card);
      }
    });
    return () => {
      current = false;
      unsubscribe?.();
    };
  }, [workspaceId]);

  /** Sends the click; returns the refusal message, BRIDGE_UNAVAILABLE or null. */
  async function choose(
    option: WorkflowModeChoiceOptionId
  ): Promise<string | null> {
    if (!card) {
      return null;
    }
    const result = await window.harnessCore?.chooseWorkflowMode({
      generation: card.generation,
      option,
      sessionId: card.sessionId,
      workspaceId,
    });
    if (!result) {
      return BRIDGE_UNAVAILABLE;
    }
    if (!result.ok) {
      return result.message;
    }
    setCard(result.card);
    return null;
  }

  return { card, choose };
}
