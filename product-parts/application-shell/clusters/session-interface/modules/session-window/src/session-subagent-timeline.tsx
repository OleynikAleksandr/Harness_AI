import { Circle, ExternalLink } from "lucide-react";
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

export function SubagentCallTimelineItem({
  call,
  onDetachSubagent,
  onOpenSubagent,
  sessions,
}: {
  call: CoreSubagentCall;
  onDetachSubagent: (sessionId: string) => void;
  onOpenSubagent: (sessionId: string) => void;
  sessions: readonly CoreSession[];
}) {
  const { t } = useBrowserLocalization();
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const childSessionIds = call.childSessionIds;
  return (
    <article className="session-dialog__message session-subagent-call">
      <header className="session-subagent-call__header">
        <span>
          {t("ui_labels", "session.subagents.started", "Subagents started")}
        </span>
        <time dateTime={call.createdAt}>{formatTime(call.createdAt)}</time>
      </header>
      {childSessionIds.length === 0 ? (
        <div className="session-subagent-call__pending">
          <Circle aria-hidden="true" fill="currentColor" size={9} />
          <span>
            {call.task ?? t("ui_labels", "session.subagent", "Subagent")}
          </span>
          <small>{resolveCallStatusLabel(call.status, t)}</small>
        </div>
      ) : (
        <div className="session-subagent-call__list">
          {childSessionIds.map((sessionId) => {
            const session = sessionById.get(sessionId);
            return (
              <div className="session-subagent-call__row" key={sessionId}>
                <Circle
                  aria-hidden="true"
                  className={`session-subagent-call__status session-subagent-call__status--${session?.subagentStatus ?? call.status}`}
                  fill="currentColor"
                  size={10}
                />
                <button
                  className="session-subagent-call__open"
                  onClick={() => onOpenSubagent(sessionId)}
                  title={session?.delegatedTask ?? call.task ?? session?.title}
                  type="button"
                >
                  <strong>
                    {session?.delegatedTask ??
                      call.task ??
                      session?.title ??
                      t("ui_labels", "session.subagent", "Subagent")}
                  </strong>
                  <small>{resolveChildMetadata(session, call, t)}</small>
                </button>
                <button
                  aria-label={t(
                    "ui_labels",
                    "session.subagent.detach",
                    "Open subagent in a new window"
                  )}
                  className="session-subagent-call__detach"
                  onClick={() => onDetachSubagent(sessionId)}
                  title={t(
                    "ui_labels",
                    "session.subagent.detach",
                    "Open subagent in a new window"
                  )}
                  type="button"
                >
                  <ExternalLink aria-hidden="true" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function resolveChildMetadata(
  session: CoreSession | undefined,
  call: CoreSubagentCall,
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string {
  return [
    session?.agentNickname,
    session?.agentRole,
    session?.model ?? call.model,
    session?.reasoningEffort ?? call.reasoningEffort,
    resolveCallStatusLabel(session?.subagentStatus ?? call.status, t),
  ]
    .filter(Boolean)
    .join(" · ");
}

function resolveCallStatusLabel(
  status: string,
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string {
  return t(
    "ui_labels",
    `session.subagent.status.${status}`,
    status.replace("_", " ")
  );
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
