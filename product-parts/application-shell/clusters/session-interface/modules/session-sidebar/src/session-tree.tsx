import { ChevronDown, ChevronRight, Circle, ExternalLink } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

interface SessionTreeProps {
  activeSessionId: string;
  contextMenuSessionId: string | null;
  onContextMenu: (session: CoreSession) => void;
  onDetachSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  renderContextMenu: (session: CoreSession) => ReactNode;
  sessions: CoreSession[];
}

export function SessionTree({
  activeSessionId,
  contextMenuSessionId,
  onContextMenu,
  onDetachSession,
  onSelectSession,
  renderContextMenu,
  sessions,
}: SessionTreeProps) {
  const { t } = useBrowserLocalization();
  const tree = useMemo(() => buildSessionTree(sessions), [sessions]);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    setExpandedSessionIds((current) => {
      const next = new Set(current);
      let parentSessionId = tree.parentBySessionId.get(activeSessionId);
      while (parentSessionId) {
        next.add(parentSessionId);
        parentSessionId = tree.parentBySessionId.get(parentSessionId);
      }
      return next;
    });
  }, [activeSessionId, tree.parentBySessionId]);

  return tree.roots.map((session) => (
    <SessionTreeNode
      activeSessionId={activeSessionId}
      contextMenuSessionId={contextMenuSessionId}
      expandedSessionIds={expandedSessionIds}
      key={session.id}
      onContextMenu={onContextMenu}
      onDetachSession={onDetachSession}
      onSelectSession={onSelectSession}
      onToggle={(sessionId) =>
        setExpandedSessionIds((current) => toggleSetValue(current, sessionId))
      }
      renderContextMenu={renderContextMenu}
      session={session}
      sessionsByParentId={tree.sessionsByParentId}
      t={t}
    />
  ));
}

function SessionTreeNode({
  activeSessionId,
  contextMenuSessionId,
  expandedSessionIds,
  onContextMenu,
  onDetachSession,
  onSelectSession,
  onToggle,
  renderContextMenu,
  session,
  sessionsByParentId,
  t,
}: {
  activeSessionId: string;
  contextMenuSessionId: string | null;
  expandedSessionIds: ReadonlySet<string>;
  onContextMenu: (session: CoreSession) => void;
  onDetachSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onToggle: (sessionId: string) => void;
  renderContextMenu: (session: CoreSession) => ReactNode;
  session: CoreSession;
  sessionsByParentId: ReadonlyMap<string, CoreSession[]>;
  t: ReturnType<typeof useBrowserLocalization>["t"];
}) {
  const children = sessionsByParentId.get(session.id) ?? [];
  const hasChildren = children.length > 0;
  const expanded = hasChildren && expandedSessionIds.has(session.id);
  const isSubagent = session.sessionKind === "subagent";
  const descendants = collectDescendants(session.id, sessionsByParentId);
  const secondaryText = isSubagent
    ? resolveSubagentSecondaryText(session, t)
    : resolveRootSummary(descendants, t);
  return (
    <div className="session-tree-node">
      <div
        className={
          session.id === activeSessionId
            ? "session-list-row session-tree-row is-active"
            : "session-list-row session-tree-row"
        }
      >
        <div className="session-list-item">
          {hasChildren ? (
            <button
              aria-expanded={expanded}
              aria-label={t(
                "ui_labels",
                expanded
                  ? "sidebar.collapseSubagents"
                  : "sidebar.expandSubagents",
                expanded ? "Collapse subagents" : "Expand subagents"
              )}
              className="session-tree-toggle"
              onClick={() => onToggle(session.id)}
              type="button"
            >
              {expanded ? (
                <ChevronDown aria-hidden="true" size={14} />
              ) : (
                <ChevronRight aria-hidden="true" size={14} />
              )}
            </button>
          ) : (
            <span aria-hidden="true" className="session-tree-toggle-spacer" />
          )}
          {isSubagent ? (
            <Circle
              aria-hidden="true"
              className={`session-tree-status session-tree-status--${session.subagentStatus ?? "pending"}`}
              fill="currentColor"
              size={9}
            />
          ) : null}
          <button
            className="session-list-title session-tree-title"
            onClick={() => onSelectSession(session.id)}
            onContextMenu={(event) => {
              if (isSubagent) {
                return;
              }
              event.preventDefault();
              onContextMenu(session);
            }}
            title={buildSessionTooltip(session)}
            type="button"
          >
            <span>{session.title}</span>
            {secondaryText ? <small>{secondaryText}</small> : null}
          </button>
          <button
            className="session-list-detach"
            onClick={() => onDetachSession(session.id)}
            title={t("ui_labels", "sidebar.detachSession", "Detach session")}
            type="button"
          >
            <ExternalLink aria-hidden="true" size={14} />
          </button>
        </div>
        {contextMenuSessionId === session.id
          ? renderContextMenu(session)
          : null}
      </div>
      {expanded ? (
        <div className="session-tree-children">
          {children.map((child) => (
            <SessionTreeNode
              activeSessionId={activeSessionId}
              contextMenuSessionId={contextMenuSessionId}
              expandedSessionIds={expandedSessionIds}
              key={child.id}
              onContextMenu={onContextMenu}
              onDetachSession={onDetachSession}
              onSelectSession={onSelectSession}
              onToggle={onToggle}
              renderContextMenu={renderContextMenu}
              session={child}
              sessionsByParentId={sessionsByParentId}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildSessionTree(sessions: readonly CoreSession[]) {
  const sessionsByParentId = new Map<string, CoreSession[]>();
  const parentBySessionId = new Map<string, string>();
  const knownIds = new Set(sessions.map((session) => session.id));
  const roots: CoreSession[] = [];
  for (const session of sessions) {
    if (
      session.sessionKind !== "subagent" ||
      !session.parentSessionId ||
      !knownIds.has(session.parentSessionId)
    ) {
      roots.push(session);
      continue;
    }
    const siblings = sessionsByParentId.get(session.parentSessionId) ?? [];
    siblings.push(session);
    sessionsByParentId.set(session.parentSessionId, siblings);
    parentBySessionId.set(session.id, session.parentSessionId);
  }
  return { parentBySessionId, roots, sessionsByParentId };
}

function collectDescendants(
  sessionId: string,
  sessionsByParentId: ReadonlyMap<string, CoreSession[]>
): CoreSession[] {
  const descendants: CoreSession[] = [];
  for (const child of sessionsByParentId.get(sessionId) ?? []) {
    descendants.push(
      child,
      ...collectDescendants(child.id, sessionsByParentId)
    );
  }
  return descendants;
}

function resolveRootSummary(
  descendants: readonly CoreSession[],
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string | null {
  if (descendants.length === 0) {
    return null;
  }
  const running = descendants.filter((session) =>
    ["pending", "running"].includes(session.subagentStatus ?? "")
  ).length;
  const agentWord =
    descendants.length === 1
      ? t("ui_labels", "sidebar.subagent.one", "subagent")
      : t("ui_labels", "sidebar.subagent.many", "subagents");
  if (running === 0) {
    return `${descendants.length} ${agentWord}`;
  }
  return `${descendants.length} ${agentWord} · ${running} ${t(
    "ui_labels",
    "sidebar.subagent.running",
    "running"
  )}`;
}

function resolveSubagentSecondaryText(
  session: CoreSession,
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string {
  const status = t(
    "ui_labels",
    `sidebar.subagent.status.${session.subagentStatus ?? "pending"}`,
    session.subagentStatus ?? "pending"
  );
  return [
    session.delegatedTask,
    session.delegatedTask ? null : session.agentRole,
    status,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildSessionTooltip(session: CoreSession): string {
  return [
    session.title,
    session.delegatedTask,
    session.model,
    session.reasoningEffort,
  ]
    .filter(Boolean)
    .join("\n");
}

function toggleSetValue(current: ReadonlySet<string>, value: string) {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
