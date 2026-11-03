import { Bot } from "lucide-react";
import { useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { useWorkflowStatus } from "./workflow-status-state.js";
import "../../../src/project-workflow-ui.css";

interface WorkflowStatusStripProps {
  /** The open session; the autopilot switch belongs to it. */
  sessionId: string | null;
  workspaceId: string;
}

/** The autopilot switch of the open session and its last decision. */
function AutopilotControl({
  autopilot,
  onToggle,
}: {
  autopilot: WorkflowAutopilotSnapshot | null;
  onToggle: (enabled: boolean) => Promise<string | null>;
}) {
  const { t } = useBrowserLocalization();
  const [error, setError] = useState<string | null>(null);
  const decision = autopilot?.lastDecision ?? null;
  const stopped =
    decision?.action === "stop" && decision.reason !== "disabled"
      ? decision
      : null;
  const enabled = autopilot?.enabled ?? false;
  return (
    <span className="workflow-status-autopilot">
      <button
        aria-pressed={enabled}
        className={`workflow-autopilot-switch${enabled ? "is-on" : ""}`}
        onClick={() => {
          setError(null);
          onToggle(!enabled)
            .then(setError)
            .catch((reason: unknown) => setError(String(reason)));
        }}
        title={t(
          "ui_helper_text",
          "workflow.strip.autopilot.description",
          "Continues the workflow tasks automatically after each turn."
        )}
        type="button"
      >
        <Bot aria-hidden="true" size={14} />
        {t("ui_labels", "workflow.strip.autopilot", "Autopilot")}
      </button>
      {autopilot?.running && decision?.action === "continue" ? (
        <small className="workflow-autopilot-state">
          {t("ui_labels", "workflow.strip.continuing", "Continuing")}
        </small>
      ) : null}
      {stopped ? (
        <small className="workflow-autopilot-state" title={stopped.detail}>
          {t(
            "ui_labels",
            `workflow.autopilot.reason.${stopped.reason}`,
            stopped.reason
          )}
        </small>
      ) : null}
      {error ? (
        <small className="workflow-autopilot-error" role="alert">
          {error}
        </small>
      ) : null}
    </span>
  );
}

/**
 * Workflow status of the active workspace: scope, current or next task,
 * progress, and the autopilot switch with its last stop reason. Shown only
 * when Core reports the Workflow Kit as installed.
 */
export function WorkflowStatusStripFacade({
  sessionId,
  workspaceId,
}: WorkflowStatusStripProps) {
  const { t } = useBrowserLocalization();
  const { autopilot, setAutopilotEnabled, status } = useWorkflowStatus(
    workspaceId,
    sessionId
  );
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
      {sessionId ? (
        <AutopilotControl
          autopilot={autopilot}
          onToggle={setAutopilotEnabled}
        />
      ) : null}
    </section>
  );
}
