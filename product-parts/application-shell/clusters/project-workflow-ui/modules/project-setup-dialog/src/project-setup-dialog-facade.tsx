import { FolderOpen, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { GitIdentityForm } from "./git-identity-form.js";
import {
  asksProjectName,
  failureText,
  needsGitIdentity,
  offersOpenWithoutKit,
  primarySetupButton,
} from "./project-setup-actions.js";
import "../../../src/project-workflow-ui.css";

// The identity form is shared with the Project Doctor through this facade.
export { GitIdentityForm } from "./git-identity-form.js";
export { failureText } from "./project-setup-actions.js";

interface ProjectSetupDialogProps {
  mode: "new" | "open";
  onClose: () => void;
  /** Core prepared and selected the workspace. */
  onPrepared: (workspace: HarnessWorkspace) => void;
}

/**
 * New Project (parent folder + name) and Open Project (folder, Core
 * inspection, install or open). Core inspects, installs and registers the
 * project; the dialog only collects the user's choice and shows results.
 * When Core stops with GIT_IDENTITY_REQUIRED the dialog asks for the git
 * identity and then repeats the same preparation.
 */
export function ProjectSetupDialogFacade({
  mode,
  onClose,
  onPrepared,
}: ProjectSetupDialogProps) {
  const { t } = useBrowserLocalization();
  const [folder, setFolder] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [inspect, setInspect] = useState<WorkflowInspectResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The `install` flag of the preparation waiting for the git identity. */
  const [identityRetry, setIdentityRetry] = useState<boolean | null>(null);
  const bridgeUnavailable = t(
    "messages_for_the_user",
    "core.bridge.unavailable",
    "Core runtime bridge is unavailable."
  );
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);
  const action = inspect?.action ?? null;
  const primary =
    mode === "new"
      ? { fallback: "Create Project", messageId: "project.setup.create" }
      : action && primarySetupButton(action);

  async function chooseFolder() {
    const picked =
      mode === "new"
        ? await window.harnessCore?.pickProjectParent()
        : await window.harnessCore?.pickProjectFolder();
    if (!picked?.path || picked.canceled) {
      return;
    }
    setFolder(picked.path);
    setInspect(null);
    setError(null);
    if (mode === "new") {
      return;
    }
    const outcome = await window.harnessCore?.inspectProjectFolder({
      path: picked.path,
    });
    if (!outcome) {
      setError(bridgeUnavailable);
    } else if (outcome.ok) {
      setInspect(outcome.result);
    } else {
      setError(failureText(outcome));
    }
  }

  async function prepare(install: boolean) {
    if (!folder) {
      return;
    }
    const projectName = name.trim();
    if (mode === "new" && !projectName) {
      setError(
        t(
          "messages_for_the_user",
          "project.setup.nameRequired",
          "Enter a project name."
        )
      );
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await window.harnessCore?.prepareProject({
        mode,
        path: folder,
        ...(asksProjectName(mode) ? { name: projectName } : {}),
        ...(install ? {} : { install: false }),
      });
      if (!result) {
        setError(bridgeUnavailable);
      } else if (result.ok) {
        onPrepared(result.workspace);
      } else if (needsGitIdentity(result)) {
        setIdentityRetry(install);
      } else {
        setError(failureText(result));
      }
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    prepare(true).catch((reason: unknown) => setError(String(reason)));
  }

  /** The identity is saved: the same preparation runs again. */
  function continueAfterIdentity() {
    const install = identityRetry ?? true;
    setIdentityRetry(null);
    prepare(install).catch((reason: unknown) => setError(String(reason)));
  }

  const stateText = inspect
    ? t(
        "ui_helper_text",
        inspect.nestedIn
          ? "project.state.nested"
          : `project.state.${inspect.state}`,
        inspect.state
      )
    : null;
  const title =
    mode === "new"
      ? t("ui_labels", "project.setup.newTitle", "New Project")
      : t("ui_labels", "project.setup.openTitle", "Open Project");

  const header = (
    <header className="project-workflow-header">
      <div>
        <h2>{title}</h2>
        <p className="project-workflow-description">
          {mode === "new"
            ? t(
                "ui_helper_text",
                "project.setup.new.description",
                "Creates the project folder with git and the Workflow Kit."
              )
            : t(
                "ui_helper_text",
                "project.setup.open.description",
                "Inspects the folder and prepares it for the Workflow Kit."
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
  );

  if (identityRetry !== null) {
    return (
      <div className="project-workflow-backdrop">
        <section
          aria-label={title}
          aria-modal="true"
          className="project-workflow-card"
          role="dialog"
        >
          {header}
          <GitIdentityForm onSaved={continueAfterIdentity} />
        </section>
      </div>
    );
  }

  return (
    <div className="project-workflow-backdrop">
      <form
        aria-label={title}
        aria-modal="true"
        className="project-workflow-card"
        onSubmit={submit}
        role="dialog"
      >
        {header}

        <div className="project-workflow-field">
          <span>
            {mode === "new"
              ? t("ui_labels", "project.setup.parentFolder", "Parent folder")
              : t("ui_labels", "project.setup.folder", "Project folder")}
          </span>
          <div className="project-workflow-folder">
            <code title={folder ?? undefined}>{folder ?? "—"}</code>
            <button
              className="project-workflow-secondary"
              disabled={pending}
              onClick={() => {
                chooseFolder().catch((reason: unknown) =>
                  setError(String(reason))
                );
              }}
              type="button"
            >
              <FolderOpen aria-hidden="true" size={14} />
              {t("ui_labels", "project.setup.chooseFolder", "Choose Folder")}
            </button>
          </div>
        </div>

        {stateText ? (
          <p
            className={`project-workflow-state project-workflow-state--${action}`}
          >
            {stateText}
          </p>
        ) : null}

        {asksProjectName(mode) ? (
          <label className="project-workflow-field">
            <span>
              {t("ui_labels", "project.setup.projectName", "Project name")}
            </span>
            <input
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
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
          {mode === "open" && action && offersOpenWithoutKit(action) ? (
            <button
              className="project-workflow-secondary"
              disabled={pending}
              onClick={() => {
                prepare(false).catch((reason: unknown) =>
                  setError(String(reason))
                );
              }}
              type="button"
            >
              {t(
                "ui_labels",
                "project.setup.openWithoutKit",
                "Open Without Kit"
              )}
            </button>
          ) : null}
          {primary ? (
            <button
              className="project-workflow-primary"
              disabled={pending || !folder}
              type="submit"
            >
              {t("ui_labels", primary.messageId, primary.fallback)}
            </button>
          ) : null}
        </footer>
      </form>
    </div>
  );
}
