import { CircleAlert, CircleCheck, CircleX, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  failureText,
  GitIdentityForm,
} from "../../project-setup-dialog/src/project-setup-dialog-facade.js";
import "../../../src/project-workflow-ui.css";

interface ProjectDoctorPanelProps {
  onClose: () => void;
  workspace: HarnessWorkspace;
}

type DoctorCheck = WorkflowDoctorReport["checks"][number];

const STATUS_FALLBACK: Record<DoctorCheck["status"], string> = {
  fail: "Failed",
  ok: "OK",
  warn: "Warning",
};

/**
 * The git identity check failed and Core cannot copy a real global identity
 * (`fixable: false`): the panel offers the identity form instead of the
 * terminal commands.
 */
function asksGitIdentity(check: DoctorCheck): boolean {
  return (
    check.id === "git-identity" && check.status === "fail" && !check.fixable
  );
}

function StatusIcon({ status }: { status: DoctorCheck["status"] }) {
  if (status === "ok") {
    return <CircleCheck aria-hidden="true" size={16} />;
  }
  if (status === "warn") {
    return <CircleAlert aria-hidden="true" size={16} />;
  }
  return <CircleX aria-hidden="true" size={16} />;
}

/**
 * Project Doctor of a workspace: the Core doctor checks with their status,
 * message and next action, and the safe fix. Core runs the doctor and the
 * fix (a `kit-update` commit); the panel only renders the report. A failing
 * git identity without a real global one offers the identity form; after
 * saving, the fix copies the identity into the project.
 */
export function ProjectDoctorPanelFacade({
  onClose,
  workspace,
}: ProjectDoctorPanelProps) {
  const { t } = useBrowserLocalization();
  const [report, setReport] = useState<WorkflowDoctorReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (fix: boolean) => {
      setPending(true);
      setError(null);
      try {
        const outcome = await window.harnessCore?.runProjectDoctor({
          fix,
          workspaceId: workspace.id,
        });
        if (!outcome) {
          setError(
            t(
              "messages_for_the_user",
              "core.bridge.unavailable",
              "Core runtime bridge is unavailable."
            )
          );
        } else if (outcome.ok) {
          setReport(outcome.result);
        } else {
          setReport(null);
          setError(failureText(outcome));
        }
      } catch (reason) {
        setError(String(reason));
      } finally {
        setPending(false);
      }
    },
    [t, workspace.id]
  );

  useEffect(() => {
    run(false).catch(() => undefined);
  }, [run]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  const fixable =
    report?.checks.some((check) => check.fixable && check.status !== "ok") ??
    false;
  const title = t("ui_labels", "project.doctor.title", "Project Doctor");

  return (
    <div className="project-workflow-backdrop">
      <section
        aria-label={title}
        aria-modal="true"
        className="project-workflow-card"
        role="dialog"
      >
        <header className="project-workflow-header">
          <div>
            <h2>{title}</h2>
            <p className="project-workflow-description">
              {workspace.name} · <code>{workspace.path}</code>
            </p>
            <p className="project-workflow-description">
              {t(
                "ui_helper_text",
                "project.doctor.description",
                "Checks the Workflow Kit files, git hooks, plan and runtime of the active workspace."
              )}
            </p>
          </div>
          <button
            className="icon-button"
            disabled={pending}
            onClick={onClose}
            title={t("ui_labels", "common.close", "Close")}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </header>

        {report ? (
          <ul className="project-doctor-checks">
            {report.checks.map((check) => (
              <li
                className={`project-doctor-check project-doctor-check--${check.status}`}
                key={check.id}
              >
                <StatusIcon status={check.status} />
                <div>
                  <strong>
                    {t(
                      "ui_labels",
                      `project.doctor.check.${check.id}`,
                      check.id
                    )}
                  </strong>
                  <span className="project-doctor-status">
                    {t(
                      "ui_labels",
                      `project.doctor.status.${check.status}`,
                      STATUS_FALLBACK[check.status]
                    )}
                  </span>
                  <p>{check.message}</p>
                  {asksGitIdentity(check) ? (
                    // Saved globally; the fix copies it into the project.
                    <GitIdentityForm
                      onSaved={() => {
                        run(true).catch(() => undefined);
                      }}
                    />
                  ) : null}
                  {check.nextAction && !asksGitIdentity(check) ? (
                    <p className="project-doctor-next">{check.nextAction}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p className="project-workflow-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="project-workflow-actions">
          {pending ? (
            <span className="project-workflow-pending" role="status">
              {t("ui_labels", "project.setup.preparing", "Preparing...")}
            </span>
          ) : null}
          <button
            className="project-workflow-secondary"
            disabled={pending}
            onClick={() => {
              run(false).catch(() => undefined);
            }}
            type="button"
          >
            {t("ui_labels", "project.doctor.recheck", "Check Again")}
          </button>
          {fixable ? (
            <button
              className="project-workflow-primary"
              disabled={pending}
              onClick={() => {
                run(true).catch(() => undefined);
              }}
              type="button"
            >
              {t("ui_labels", "project.doctor.fix", "Fix")}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
