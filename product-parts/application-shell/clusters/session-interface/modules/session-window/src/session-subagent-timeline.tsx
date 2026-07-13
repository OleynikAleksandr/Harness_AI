import type { CoreSubagentCall } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type { SessionMessage } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

export type SessionTimelineItem =
  | { id: string; kind: "message"; message: SessionMessage; timestamp: string }
  | {
      calls: CoreSubagentCall[];
      id: string;
      kind: "subagent-launch";
      timestamp: string;
    };

// Consecutive subagent launches collapse into one divider item so the dialog
// shows a single line with a growing launch count instead of stacked cards
// (docs/architecture/ClaudeSubagentSessions.md, section 5).
export function buildSessionTimeline(
  messages: readonly SessionMessage[],
  subagentCalls: readonly CoreSubagentCall[]
): SessionTimelineItem[] {
  const entries = [
    ...messages.map((message) => ({
      kind: "message" as const,
      message,
      timestamp: message.timestamp,
    })),
    ...subagentCalls.map((call) => ({
      call,
      kind: "call" as const,
      timestamp: call.createdAt,
    })),
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const timeline: SessionTimelineItem[] = [];
  for (const entry of entries) {
    if (entry.kind === "message") {
      timeline.push({
        id: `message:${entry.message.id}`,
        kind: "message",
        message: entry.message,
        timestamp: entry.timestamp,
      });
      continue;
    }
    const previous = timeline.at(-1);
    if (previous?.kind === "subagent-launch") {
      previous.calls.push(entry.call);
      continue;
    }
    timeline.push({
      calls: [entry.call],
      id: `subagent-launch:${entry.call.id}`,
      kind: "subagent-launch",
      timestamp: entry.timestamp,
    });
  }
  return timeline;
}

export function countLaunchedSubagents(
  calls: readonly CoreSubagentCall[]
): number {
  return calls.reduce(
    (total, call) => total + Math.max(call.childSessionIds.length, 1),
    0
  );
}

export function buildTimelineScrollMessages(
  timeline: readonly SessionTimelineItem[]
): SessionMessage[] {
  return timeline.map((item) =>
    item.kind === "message"
      ? item.message
      : {
          id: item.id,
          role: "system",
          text: item.calls
            .map((call) => `${call.status}:${call.updatedAt}`)
            .join("|"),
          timestamp: item.timestamp,
        }
  );
}

// The divider is the only dialog trace of subagent activity: a horizontal
// rule broken in the middle by the localized label and the launch count.
// Task lists, open/detach controls and live statuses live in the sidebar
// tree only (docs/architecture/ClaudeSubagentSessions.md, section 5).
export function SubagentLaunchDivider({
  calls,
}: {
  calls: readonly CoreSubagentCall[];
}) {
  const { t } = useBrowserLocalization();
  return (
    <div className="session-subagent-divider">
      <span className="session-subagent-divider__label">
        {t("ui_labels", "session.subagents.launched", "Subagents launched")}
        <span className="session-subagent-divider__count">
          {countLaunchedSubagents(calls)}
        </span>
      </span>
    </div>
  );
}
