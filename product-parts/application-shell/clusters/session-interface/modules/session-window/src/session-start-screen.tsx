import { FolderOpen, Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { ProjectSetupDialogFacade } from "../../../../project-workflow-ui/modules/project-setup-dialog/src/project-setup-dialog-facade.js";

/**
 * The ordinary window content: `children(workspace)` while Core has an
 * active project, the start screen once the Core list arrived without one
 * (an empty project list included), nothing before the first list.
 */
export function SessionWorkspaceGate({
  children,
  loaded,
  onPrepared,
  workspace,
}: {
  children: (workspace: HarnessWorkspace) => ReactNode;
  loaded: boolean;
  onPrepared: (workspace: HarnessWorkspace) => void;
  workspace: HarnessWorkspace | null;
}) {
  if (workspace) {
    return children(workspace);
  }
  return loaded ? <SessionStartScreen onPrepared={onPrepared} /> : null;
}

/**
 * The window content while Core has no active project (an empty project
 * list included): the Open Project and New Project entries of the workspace
 * menu. Each opens the same project setup dialog (mode `open`/`new`); the
 * prepared project goes to `onPrepared`, which shows it in the window.
 */
function SessionStartScreen({
  onPrepared,
}: {
  onPrepared: (workspace: HarnessWorkspace) => void;
}) {
  const { t } = useBrowserLocalization();
  const [setupMode, setSetupMode] = useState<"new" | "open" | null>(null);
  return (
    <main className="session-start-screen">
      <div className="session-start-screen__panel">
        <h1>Harness AI</h1>
        <div className="session-start-screen__action">
          <button
            className="start-new-session-button"
            onClick={() => setSetupMode("open")}
            type="button"
          >
            <FolderOpen aria-hidden="true" size={16} />
            <span>{t("ui_labels", "sidebar.openProject", "Open Project")}</span>
          </button>
          <small>
            {t(
              "ui_helper_text",
              "project.setup.open.description",
              "Inspects the folder and prepares it for the Workflow Kit."
            )}
          </small>
        </div>
        <div className="session-start-screen__action">
          <button
            className="start-new-session-button"
            onClick={() => setSetupMode("new")}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            <span>{t("ui_labels", "sidebar.newProject", "New Project")}</span>
          </button>
          <small>
            {t(
              "ui_helper_text",
              "project.setup.new.description",
              "Creates the project folder with git and the Workflow Kit."
            )}
          </small>
        </div>
      </div>
      {setupMode ? (
        <ProjectSetupDialogFacade
          mode={setupMode}
          onClose={() => setSetupMode(null)}
          onPrepared={(workspace) => {
            setSetupMode(null);
            onPrepared(workspace);
          }}
        />
      ) : null}
    </main>
  );
}
