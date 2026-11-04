import { Circle, CircleCheck, CircleDot } from "lucide-react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import "./project-plan-panel.css";

export { useProjectPlanView } from "./project-plan-panel-state.js";

type PlanRow = WorkflowPlanView["rows"][number];
type Translate = ReturnType<typeof useBrowserLocalization>["t"];

interface ProjectPlanPanelProps {
  /** The open session; the row of that executor is highlighted. */
  activeSessionId: string;
  /** The sidebar session-select path. */
  onOpenSession: (sessionId: string) => void;
  planView: WorkflowPlanView;
}

const TASK_STATUS_LABELS: Readonly<Record<PlanRow["status"], string>> = {
  DONE: "Done",
  IN_PROGRESS: "In progress",
  TODO: "To do",
};

const SCOPE_STATE_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: "Active",
  BLOCKED: "Blocked",
};

function StatusIcon({ row, t }: { row: PlanRow; t: Translate }) {
  const label = t(
    "ui_labels",
    `workflow.plan.taskStatus.${row.status}`,
    TASK_STATUS_LABELS[row.status]
  );
  const className = `project-plan-status project-plan-status--${row.status}`;
  if (row.status === "DONE") {
    return <CircleCheck aria-label={label} className={className} size={14} />;
  }
  if (row.status === "IN_PROGRESS") {
    return <CircleDot aria-label={label} className={className} size={14} />;
  }
  return <Circle aria-label={label} className={className} size={14} />;
}

function RowContent({ row, t }: { row: PlanRow; t: Translate }) {
  return (
    <>
      <StatusIcon row={row} t={t} />
      <span className="project-plan-row-id">{row.taskId}</span>
      <span className="project-plan-row-title">{row.title}</span>
      {row.label ? (
        <small className="project-plan-row-label">
          {row.label === "parallel"
            ? t("ui_labels", "workflow.plan.parallel", "parallel")
            : t("ui_labels", "workflow.plan.sequential", "sequential")}
        </small>
      ) : null}
    </>
  );
}

function rowClass(row: PlanRow, selected: boolean): string {
  return [
    "project-plan-row",
    row.current ? "is-current" : "",
    row.executorSessionId ? "is-link" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The active plan under the owner session's card in the sidebar (spec 10.2
 * of `WorkflowKitExecutionModes.md`): a pinned header with the scope
 * objective, state and progress, and scrollable task rows. Everything comes
 * from the Core plan view; a row with an executor session opens it.
 */
export function ProjectPlanPanelFacade({
  activeSessionId,
  onOpenSession,
  planView,
}: ProjectPlanPanelProps) {
  const { t } = useBrowserLocalization();
  return (
    <section
      aria-label={t("ui_labels", "workflow.plan.title", "Plan")}
      className="project-plan-panel"
    >
      <header className="project-plan-header">
        <strong title={planView.scopeId}>{planView.objective}</strong>
        <small>
          {t(
            "ui_labels",
            `workflow.plan.state.${planView.status}`,
            SCOPE_STATE_LABELS[planView.status] ?? planView.status
          )}
          {" · "}
          {planView.progress.done}{" "}
          {t("ui_labels", "workflow.plan.progressOf", "of")}{" "}
          {planView.progress.total}{" "}
          {t("ui_labels", "workflow.plan.progressDone", "done")}
        </small>
      </header>
      <ol className="project-plan-rows">
        {planView.rows.map((row) => {
          const executor = row.executorSessionId;
          const selected = executor !== null && executor === activeSessionId;
          return (
            <li key={row.taskId}>
              {executor ? (
                <button
                  aria-current={selected ? "page" : undefined}
                  className={rowClass(row, selected)}
                  onClick={() => onOpenSession(executor)}
                  title={t(
                    "ui_helper_text",
                    "workflow.plan.openExecutor",
                    "Open the executor session"
                  )}
                  type="button"
                >
                  <RowContent row={row} t={t} />
                </button>
              ) : (
                <div
                  aria-current={row.current ? "step" : undefined}
                  className={rowClass(row, false)}
                >
                  <RowContent row={row} t={t} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
