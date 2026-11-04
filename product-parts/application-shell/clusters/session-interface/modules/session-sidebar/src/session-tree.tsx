import { ChevronDown, ChevronRight, Circle, ExternalLink } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  ExecutionModeCardFacade,
  type ExecutionModeChoice,
} from "../../../../project-workflow-ui/modules/execution-mode-card/src/execution-mode-card-facade.js";
import { ProjectPlanPanelFacade } from "../../../../project-workflow-ui/modules/project-plan-panel/src/project-plan-panel-facade.js";

// Viewport coordinates of the row edge the menu attaches to. The menu
// renders position:fixed so the scrollable session list cannot clip it.
export interface SessionContextMenuAnchor {
  readonly right: number;
  readonly top: number;
}

interface SessionTreeProps {
  activeSessionId: string;
  contextMenuSessionId: string | null;
  /** The Core mode card of the workspace; rendered under its owner's card. */
  modeChoice: ExecutionModeChoice | null;
  onContextMenu: (
    session: CoreSession,
    anchor: SessionContextMenuAnchor
  ) => void;
  onDetachSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  /** The Core plan view of the workspace; rendered under its owner's card. */
  planView: WorkflowPlanView | null;
  renderContextMenu: (session: CoreSession) => ReactNode;
  sessions: CoreSession[];
}

export function SessionTree({
  activeSessionId,
  contextMenuSessionId,
  modeChoice,
  onContextMenu,
  onDetachSession,
  onSelectSession,
  planView,
  renderContextMenu,
  sessions,
}: SessionTreeProps) {
  const { t } = useBrowserLocalization();
  // The plan shows only under a listed owner card; its bound executors are
  // reached through the plan rows instead of child cards (Core binding).
  const plan =
    planView?.ownerSessionId &&
    sessions.some((session) => session.id === planView.ownerSessionId)
      ? planView
      : null;
  const tree = useMemo(
    () => buildSessionTree(sessions, new Set(plan?.boundSessionIds ?? [])),
    [sessions, plan?.boundSessionIds]
  );
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
      modeChoice={modeChoice}
      onContextMenu={onContextMenu}
      onDetachSession={onDetachSession}
      onSelectSession={onSelectSession}
      onToggle={(sessionId) =>
        setExpandedSessionIds((current) => toggleSetValue(current, sessionId))
      }
      plan={plan}
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
  modeChoice,
  onContextMenu,
  onDetachSession,
  onSelectSession,
  onToggle,
  plan,
  renderContextMenu,
  session,
  sessionsByParentId,
  t,
}: {
  activeSessionId: string;
  contextMenuSessionId: string | null;
  expandedSessionIds: ReadonlySet<string>;
  modeChoice: ExecutionModeChoice | null;
  onContextMenu: (
    session: CoreSession,
    anchor: SessionContextMenuAnchor
  ) => void;
  onDetachSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onToggle: (sessionId: string) => void;
  plan: WorkflowPlanView | null;
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
  const ownedPlan = plan?.ownerSessionId === session.id ? plan : null;
  const secondaryText = isSubagent
    ? resolveSubagentSecondaryText(session, t)
    : resolvePrimarySecondaryText(ownedPlan, descendants, t);
  // Every interactive element of the row opens the menu on right-click and
  // the title button stretches over the free row width: title-only handling
  // left dead zones (padding, chevron, detach icon) where the gesture
  // silently did nothing.
  const openRowContextMenu = (event: ReactMouseEvent) => {
    if (isSubagent) {
      return;
    }
    event.preventDefault();
    const row = (event.currentTarget as HTMLElement).closest(
      ".session-list-row"
    );
    const rect = (row ?? event.currentTarget).getBoundingClientRect();
    onContextMenu(session, { right: rect.right, top: rect.bottom + 4 });
  };
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
              onContextMenu={openRowContextMenu}
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
            onContextMenu={openRowContextMenu}
            title={buildSessionTooltip(session)}
            type="button"
          >
            <span>{session.title}</span>
            {secondaryText ? <small>{secondaryText}</small> : null}
          </button>
          <button
            className="session-list-detach"
            onClick={() => onDetachSession(session.id)}
            onContextMenu={openRowContextMenu}
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
      <OwnerPlanSlot
        activeSessionId={activeSessionId}
        modeChoice={modeChoice}
        onSelectSession={onSelectSession}
        ownedPlan={ownedPlan}
        sessionId={session.id}
      />
      {expanded ? (
        <div className="session-tree-children">
          {children.map((child) => (
            <SessionTreeNode
              activeSessionId={activeSessionId}
              contextMenuSessionId={contextMenuSessionId}
              expandedSessionIds={expandedSessionIds}
              key={child.id}
              modeChoice={modeChoice}
              onContextMenu={onContextMenu}
              onDetachSession={onDetachSession}
              onSelectSession={onSelectSession}
              onToggle={onToggle}
              plan={plan}
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

/**
 * The slot under a session card: the Core mode card when this session owns
 * it, and the plan it owns. While the card waits for the choice (offered or
 * saving) the plan is not shown; once chosen, the compact line stays above
 * the plan until Core removes the card.
 */
function OwnerPlanSlot({
  activeSessionId,
  modeChoice,
  onSelectSession,
  ownedPlan,
  sessionId,
}: {
  activeSessionId: string;
  modeChoice: ExecutionModeChoice | null;
  onSelectSession: (sessionId: string) => void;
  ownedPlan: WorkflowPlanView | null;
  sessionId: string;
}) {
  const card =
    modeChoice?.card?.sessionId === sessionId &&
    modeChoice.card.state !== "dismissed"
      ? modeChoice.card
      : null;
  const choosing = card !== null && card.state !== "chosen";
  return (
    <>
      {card && modeChoice ? (
        <ExecutionModeCardFacade card={card} onChoose={modeChoice.choose} />
      ) : null}
      {ownedPlan && !choosing ? (
        <ProjectPlanPanelFacade
          activeSessionId={activeSessionId}
          onOpenSession={onSelectSession}
          planView={ownedPlan}
        />
      ) : null}
    </>
  );
}

/** `hidden`: executor sessions the plan rows open; they get no card. */
function buildSessionTree(
  sessions: readonly CoreSession[],
  hidden: ReadonlySet<string>
) {
  const sessionsByParentId = new Map<string, CoreSession[]>();
  const parentBySessionId = new Map<string, string>();
  const knownIds = new Set(sessions.map((session) => session.id));
  const roots: CoreSession[] = [];
  for (const session of sessions) {
    if (hidden.has(session.id)) {
      continue;
    }
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

/**
 * A primary card's secondary line: the plan owner's role from the Core plan
 * mode ("Orchestrator" or "Agent"), then the descendant summary.
 */
function resolvePrimarySecondaryText(
  ownedPlan: WorkflowPlanView | null,
  descendants: readonly CoreSession[],
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string | null {
  let role: string | null = null;
  if (ownedPlan) {
    role =
      ownedPlan.mode === "orchestrated"
        ? t("ui_labels", "sidebar.role.orchestrator", "Orchestrator")
        : t("ui_labels", "sidebar.role.agent", "Agent");
  }
  const summary = resolveRootSummary(descendants, t);
  return [role, summary].filter(Boolean).join(" · ") || null;
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
