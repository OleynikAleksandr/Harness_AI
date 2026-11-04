import { FolderOpen, Plus, Stethoscope } from "lucide-react";
import { type MouseEvent as ReactMouseEvent, useEffect, useState } from "react";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

interface WorkspaceMenuProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onOpenProjectDoctor: () => void;
  /** Asks Core to remove the project from the app; resolves to an error. */
  onRemoveWorkspace: (workspaceId: string) => Promise<string | null>;
  onSelectWorkspace: (workspaceId: string) => void;
  workspace: HarnessWorkspace;
  workspaces: HarnessWorkspace[];
}

interface ProjectMenuState {
  left: number;
  top: number;
  workspaceId: string;
}

/**
 * The project list of the workspace switcher plus the New/Open Project and
 * Project Doctor entries. Right-click on any project opens an in-app context
 * menu whose first item removes the project from the app (Core decides what
 * that removes; the project folder stays on disk). There is no built-in
 * project: every project, the active one included, can be removed.
 */
export function WorkspaceMenu({
  onNewProject,
  onOpenProject,
  onOpenProjectDoctor,
  onRemoveWorkspace,
  onSelectWorkspace,
  workspace,
  workspaces,
}: WorkspaceMenuProps) {
  const { t } = useBrowserLocalization();
  const [menu, setMenu] = useState<ProjectMenuState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!menu) {
      return;
    }
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest(".workspace-context-menu")
      ) {
        setMenu(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  function openProjectMenu(event: ReactMouseEvent, item: HarnessWorkspace) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setError(null);
    setMenu({
      left: rect.left + 12,
      top: rect.bottom - 4,
      workspaceId: item.id,
    });
  }

  async function removeProject(workspaceId: string) {
    setPending(true);
    const failure = await onRemoveWorkspace(workspaceId);
    setPending(false);
    if (failure) {
      setError(failure);
      return;
    }
    setMenu(null);
  }

  return (
    <div className="workspace-menu">
      {workspaces.map((item) => (
        <button
          className={
            item.id === workspace.id
              ? "workspace-menu-item is-active"
              : "workspace-menu-item"
          }
          key={item.id}
          onClick={() => onSelectWorkspace(item.id)}
          onContextMenu={(event) => openProjectMenu(event, item)}
          type="button"
        >
          <strong>{item.name}</strong>
          <small>{item.path}</small>
        </button>
      ))}
      <button
        className="workspace-menu-item workspace-menu-item--add"
        onClick={onNewProject}
        type="button"
      >
        <Plus aria-hidden="true" size={14} />
        <span>{t("ui_labels", "sidebar.newProject", "New Project")}</span>
      </button>
      <button
        className="workspace-menu-item workspace-menu-item--add"
        onClick={onOpenProject}
        type="button"
      >
        <FolderOpen aria-hidden="true" size={14} />
        <span>{t("ui_labels", "sidebar.openProject", "Open Project")}</span>
      </button>
      <button
        className="workspace-menu-item workspace-menu-item--add"
        onClick={onOpenProjectDoctor}
        type="button"
      >
        <Stethoscope aria-hidden="true" size={14} />
        <span>{t("ui_labels", "sidebar.projectDoctor", "Project Doctor")}</span>
      </button>
      {menu ? (
        <div
          className="session-context-menu workspace-context-menu"
          style={{ left: menu.left, top: menu.top }}
        >
          <button
            className="is-danger"
            disabled={pending}
            onClick={() => {
              removeProject(menu.workspaceId).catch(() => setPending(false));
            }}
            type="button"
          >
            {t("ui_labels", "sidebar.removeProject", "Remove from Harness AI")}
          </button>
          {error ? (
            <small className="session-context-error">{error}</small>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
