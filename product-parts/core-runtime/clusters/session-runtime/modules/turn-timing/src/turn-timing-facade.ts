import type { SessionCoreEvent } from "../../session-event-stream/src/session-event-stream-facade.js";

export interface TurnTiming {
  /** Summed duration of every completed turn, in milliseconds. */
  activeMs: number;
  /**
   * ISO timestamp of the first `running` event of the currently open turn, or
   * `null` when no turn is open. The caller decides whether an open turn is a
   * live in-flight turn or an orphaned leftover from a previous app run.
   */
  runningSince: string | null;
}

/**
 * Derives per-turn timing from the persisted `session:turn-state` events of
 * one session. The event array is the append-only Core event log and is
 * already chronological (live publishes append; history hydration re-sorts by
 * timestamp), so array order is trusted and timestamps are used only for
 * durations.
 *
 * Rules:
 * - A `running` event followed by the next `idle` event is a closed turn;
 *   `idle.timestamp - running.timestamp` accumulates into `activeMs`.
 * - Consecutive `running` events without an `idle` in between continue the
 *   same turn; the turn starts at the FIRST `running` of the series
 *   (sendMessage publishes `running`, then `turn_started` republishes it).
 * - A trailing `running` with no closing `idle` is an open turn: its start is
 *   reported as `runningSince` and it contributes nothing to `activeMs`.
 */
export function deriveTurnTiming(
  events: readonly SessionCoreEvent[],
  sessionId: string
): TurnTiming {
  let activeMs = 0;
  let runningSince: string | null = null;
  for (const event of events) {
    if (
      event.type !== "session:turn-state" ||
      event.payload.sessionId !== sessionId
    ) {
      continue;
    }
    if (event.payload.state === "running") {
      if (runningSince === null) {
        runningSince = event.timestamp;
      }
      continue;
    }
    if (runningSince !== null) {
      activeMs += Math.max(
        0,
        Date.parse(event.timestamp) - Date.parse(runningSince)
      );
      runningSince = null;
    }
  }
  return { activeMs, runningSince };
}
