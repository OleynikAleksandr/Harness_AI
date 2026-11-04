import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useWorkflowAutopilot } from "../../project-plan-panel/src/project-plan-panel-facade.js";
import { useWorkflowStatus } from "./workflow-status-state.js";
import "../../../src/project-workflow-ui.css";

interface WorkflowStatusStripProps {
  /** The open session; the autopilot state shown belongs to it. */
  sessionId: string | null;
  workspaceId: string;
}

/**
 * The last autopilot decision of the open session from the Core snapshot:
 * "Continuing" while an autopilot turn runs, otherwise the localized stop
 * reason (`disabled` is not shown). The pause button lives in the plan.
 */
function AutopilotState({
  autopilot,
}: {
  autopilot: WorkflowAutopilotSnapshot;
}) {
  const { t } = useBrowserLocalization();
  const decision = autopilot.lastDecision;
  if (autopilot.running && decision?.action === "continue") {
    return (
      <small className="workflow-autopilot-state">
        {t("ui_labels", "workflow.strip.continuing", "Continuing")}
      </small>
    );
  }
  if (decision?.action === "stop" && decision.reason !== "disabled") {
    return (
      <small className="workflow-autopilot-state" title={decision.detail}>
        {t(
          "ui_labels",
          `workflow.autopilot.reason.${decision.reason}`,
          decision.reason
        )}
      </small>
    );
  }
  return null;
}

/**
 * Workflow status of the active workspace: scope, current or next task,
 * progress, and the last autopilot decision of the open session. Shown only
 * when Core reports the Workflow Kit as installed.
 */
export function WorkflowStatusStripFacade({
  sessionId,
  workspaceId,
}: WorkflowStatusStripProps) {
  const { t } = useBrowserLocalization();
  const status = useWorkflowStatus(workspaceId);
  const { autopilot } = useWorkflowAutopilot(sessionId);
  if (!(status?.ok && status.result.installed)) {
    return null;
  }
  const kit = status.result;
  const task = kit.currentTask ?? kit.nextTask;

  return (
    <section
      aria-label={t("ui_labels", "workflow.strip.label", "Workflow")}
      className="workflow-status-strip"
    >
      <span className="workflow-status-item">
        <small>{t("ui_labels", "workflow.strip.scope", "Scope")}</small>
        {kit.scope ? (
          <strong title={kit.scope.objective}>
            {kit.scope.id} · {kit.scope.status}
          </strong>
        ) : (
          <strong>
            {t("ui_labels", "workflow.strip.noScope", "No active scope")}
          </strong>
        )}
      </span>
      {task ? (
        <span className="workflow-status-item">
          <small>
            {kit.currentTask
              ? t("ui_labels", "workflow.strip.task", "Task")
              : t("ui_labels", "workflow.strip.next", "Next")}
          </small>
          <strong title={task.title}>
            {task.id} {task.title}
          </strong>
        </span>
      ) : null}
      {kit.scope ? (
        <span className="workflow-status-item">
          <small>{t("ui_labels", "workflow.strip.progress", "Progress")}</small>
          <strong>
            {kit.progress.done}/{kit.progress.total}
          </strong>
        </span>
      ) : null}
      {sessionId && autopilot?.available ? (
        <AutopilotState autopilot={autopilot} />
      ) : null}
    </section>
  );
}
