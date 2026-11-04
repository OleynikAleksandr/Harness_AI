import { Circle, CircleCheck, CircleDot, Pause, Play } from "lucide-react";
import { useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useWorkflowAutopilot } from "./project-plan-pause-state.js";
import "./project-plan-panel.css";

export { useProjectPlanView } from "./project-plan-panel-state.js";
export { useWorkflowAutopilot } from "./project-plan-pause-state.js";

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

const PAUSE_LABELS: Readonly<
  Record<WorkflowAutopilotSnapshot["pauseState"], [string, string]>
> = {
  paused: ["workflow.plan.continue", "Continue"],
  pausing: ["workflow.plan.pausing", "Pausing after the current task"],
  running: ["workflow.plan.pause", "Pause"],
};

/**
 * The pause button of the plan, driven only by the Core `pauseState` of the
 * owner session: `running` pauses, `paused` continues, `pausing` waits for
 * the current task and is disabled. A Core/Kit failure is shown inline.
 */
function PlanPauseButton({
  ownerSessionId,
  t,
}: {
  ownerSessionId: string | null;
  t: Translate;
}) {
  const { autopilot, setPaused } = useWorkflowAutopilot(ownerSessionId);
  const [error, setError] = useState<string | null>(null);
  if (!autopilot?.available) {
    return null;
  }
  const { pauseState } = autopilot;
  const [key, fallback] = PAUSE_LABELS[pauseState];
  return (
    <div className="project-plan-pause">
      <button
        className={`project-plan-pause-button is-${pauseState}`}
        disabled={pauseState === "pausing"}
        onClick={() => {
          setError(null);
          setPaused(pauseState === "running")
            .then(setError)
            .catch((reason: unknown) => setError(String(reason)));
        }}
        type="button"
      >
        {pauseState === "paused" ? (
          <Play aria-hidden="true" size={12} />
        ) : (
          <Pause aria-hidden="true" size={12} />
        )}
        {t("ui_labels", key, fallback)}
      </button>
      {error ? (
        <small className="project-plan-pause-error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
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
 * objective, state, progress and the pause button of the owner session, and
 * scrollable task rows. Everything comes from the Core plan view and the
 * Core autopilot snapshot; a row with an executor session opens it.
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
        <PlanPauseButton ownerSessionId={planView.ownerSessionId} t={t} />
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
