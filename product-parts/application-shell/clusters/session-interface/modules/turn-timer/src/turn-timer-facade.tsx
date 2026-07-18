import { useEffect, useState } from "react";

/**
 * Formats a millisecond duration as `HHh MMm SSs`. Every field is
 * zero-padded to two digits; hours are not capped at 99.
 */
export function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
    2,
    "0"
  )}m ${String(seconds).padStart(2, "0")}s`;
}

interface SessionTotalTimerProps {
  /** Summed duration of every completed turn, in milliseconds. */
  activeMs: number;
}

/**
 * Footer-right total of completed turns. Static between turns: it re-renders
 * only when `activeMs` changes, so it runs no interval of its own.
 */
export function SessionTotalTimer({ activeMs }: SessionTotalTimerProps) {
  return (
    <span className="session-input__total">
      total: {formatElapsedMs(activeMs)}
    </span>
  );
}

interface TurnTimerProps {
  /**
   * ISO timestamp of the open turn's start, or `null` when no turn runs.
   * Rendered only while a turn is live.
   */
  runningSince: string | null;
}

/**
 * Input-row per-turn timer. Ticks once per second while `runningSince` points
 * at a live turn; renders nothing when idle or when the timestamp is invalid.
 */
export function TurnTimer({ runningSince }: TurnTimerProps) {
  const [now, setNow] = useState(Date.now());
  const startedAt =
    runningSince === null ? Number.NaN : Date.parse(runningSince);
  const running = Number.isFinite(startedAt);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!running) {
    return null;
  }
  return (
    <span className="session-input__turn">
      turn: {formatElapsedMs(now - startedAt)}
    </span>
  );
}
