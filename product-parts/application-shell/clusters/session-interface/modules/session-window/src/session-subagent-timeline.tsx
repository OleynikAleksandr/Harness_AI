import type { CoreSubagentCall } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type { SessionMessage } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

export type SessionTimelineItem =
  | { id: string; kind: "message"; message: SessionMessage; timestamp: string }
  | {
      call: CoreSubagentCall;
      id: string;
      kind: "subagent-call";
      timestamp: string;
    };

export function buildSessionTimeline(
  messages: readonly SessionMessage[],
  subagentCalls: readonly CoreSubagentCall[]
): SessionTimelineItem[] {
  return [
    ...messages.map(
      (message): SessionTimelineItem => ({
        id: `message:${message.id}`,
        kind: "message",
        message,
        timestamp: message.timestamp,
      })
    ),
    ...subagentCalls.map(
      (call): SessionTimelineItem => ({
        call,
        id: `subagent-call:${call.id}`,
        kind: "subagent-call",
        timestamp: call.createdAt,
      })
    ),
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
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
          text: `${item.call.status}:${item.call.updatedAt}`,
          timestamp: item.call.createdAt,
        }
  );
}

// Text-only info panel: launch count plus the delegated task list. Open,
// detach and live statuses live in the sidebar tree only
// (docs/architecture/ClaudeSubagentSessions.md, section 5).
export function SubagentCallTimelineItem({
  call,
  sessions,
}: {
  call: CoreSubagentCall;
  sessions: readonly CoreSession[];
}) {
  const { t } = useBrowserLocalization();
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const tasks = resolveDelegatedTasks(call, sessionById);
  const count = Math.max(call.childSessionIds.length, 1);
  const agentWord =
    count === 1
      ? t("ui_labels", "sidebar.subagent.one", "subagent")
      : t("ui_labels", "sidebar.subagent.many", "subagents");
  return (
    <article className="session-dialog__message session-subagent-call">
      <header className="session-subagent-call__header">
        <span>
          {t("ui_labels", "session.subagents.started", "Subagents started")}
        </span>
        <time dateTime={call.createdAt}>{formatTime(call.createdAt)}</time>
      </header>
      <p className="session-subagent-call__summary">
        {`${count} ${agentWord} ${t(
          "ui_labels",
          "session.subagents.launchedForTasks",
          "launched for the following tasks:"
        )}`}
      </p>
      {tasks.length > 0 ? (
        <ul className="session-subagent-call__tasks">
          {tasks.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function resolveDelegatedTasks(
  call: CoreSubagentCall,
  sessionById: ReadonlyMap<string, CoreSession>
): string[] {
  const tasks = call.childSessionIds
    .map((sessionId) => {
      const session = sessionById.get(sessionId);
      return session?.delegatedTask ?? session?.title ?? call.task;
    })
    .filter((task): task is string => Boolean(task && task.trim().length > 0));
  if (tasks.length === 0 && call.task) {
    tasks.push(call.task);
  }
  return [...new Set(tasks)];
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
