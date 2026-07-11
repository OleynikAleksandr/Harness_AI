import { ChevronDown, FolderPlus, Plus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import { SessionTree } from "./session-tree.js";

interface SessionSidebarProps {
  activeSessionId: string;
  isWorkspaceMenuOpen: boolean;
  onAddWorkspace: () => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onDetachSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  onRegenerateSessionTitle?: (sessionId: string) => Promise<string | null>;
  onRenameSession?: (
    sessionId: string,
    title: string
  ) => Promise<string | null>;
  onSelectSession: (sessionId: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onToggleWorkspaceMenu: () => void;
  sessions: CoreSession[];
  workspace: HarnessWorkspace;
  workspaces: HarnessWorkspace[];
}

export function SessionSidebarFacade({
  workspace,
  workspaces,
  sessions,
  activeSessionId,
  isWorkspaceMenuOpen,
  onAddWorkspace,
  onCreateSession,
  onDeleteSession,
  onDetachSession,
  onOpenSettings,
  onRegenerateSessionTitle,
  onRenameSession,
  onSelectSession,
  onSelectWorkspace,
  onToggleWorkspaceMenu,
}: SessionSidebarProps) {
  const { t } = useBrowserLocalization();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<
    string | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<CoreSession | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamePending, setRenamePending] = useState(false);

  useEffect(() => {
    if (!menuSessionId) {
      return;
    }
    function closeMenu(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest(".session-context-menu")
      ) {
        setMenuSessionId(null);
        setConfirmDeleteSessionId(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuSessionId(null);
        setConfirmDeleteSessionId(null);
      }
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuSessionId]);

  useEffect(() => {
    if (!renameTarget) {
      return;
    }
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRenameTarget(null);
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [renameTarget]);

  function openContextMenu(session: CoreSession) {
    setConfirmDeleteSessionId(null);
    setMenuError(null);
    setMenuSessionId(session.id);
  }

  function openRenameDialog(session: CoreSession) {
    setMenuSessionId(null);
    setRenameError(null);
    setRenameDraft(session.title);
    setRenameTarget(session);
  }

  async function submitRename() {
    if (!(renameTarget && onRenameSession)) {
      return;
    }
    setRenamePending(true);
    const error = await onRenameSession(renameTarget.id, renameDraft);
    setRenamePending(false);
    if (error) {
      setRenameError(error);
      return;
    }
    setRenameTarget(null);
  }

  function renderContextMenu(session: CoreSession) {
    return (
      <div className="session-context-menu">
        {confirmDeleteSessionId === session.id ? (
          <>
            <strong>
              {t(
                "messages_for_the_user",
                "sidebar.deleteConfirm",
                "Delete session?"
              )}
            </strong>
            <div className="session-context-actions">
              <button
                onClick={() => {
                  setMenuSessionId(null);
                  setConfirmDeleteSessionId(null);
                }}
                type="button"
              >
                {t("ui_labels", "common.cancel", "Cancel")}
              </button>
              <button
                className="is-danger"
                onClick={() => {
                  setMenuSessionId(null);
                  setConfirmDeleteSessionId(null);
                  onDeleteSession(session.id);
                }}
                type="button"
              >
                {t("ui_labels", "common.delete", "Delete")}
              </button>
            </div>
          </>
        ) : (
          <>
            {onRenameSession ? (
              <button onClick={() => openRenameDialog(session)} type="button">
                {t("ui_labels", "sidebar.renameSession", "Rename")}
              </button>
            ) : null}
            {onRegenerateSessionTitle ? (
              <button
                onClick={async () => {
                  const error = await onRegenerateSessionTitle(session.id);
                  if (error) {
                    setMenuError(error);
                    return;
                  }
                  setMenuSessionId(null);
                }}
                type="button"
              >
                {t(
                  "ui_labels",
                  "sidebar.regenerateSessionTitle",
                  "Regenerate title"
                )}
              </button>
            ) : null}
            <button
              className="is-danger"
              onClick={() => setConfirmDeleteSessionId(session.id)}
              type="button"
            >
              {t("ui_labels", "common.delete", "Delete")}
            </button>
            {menuError ? (
              <small className="session-context-error">{menuError}</small>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <aside
      aria-label={t(
        "ui_labels",
        "sidebar.workspaceSessions",
        "Workspace sessions"
      )}
      className="session-sidebar"
      ref={sidebarRef}
    >
      <div className="workspace-switcher-wrap">
        <button
          aria-expanded={isWorkspaceMenuOpen}
          className="workspace-switcher"
          onClick={onToggleWorkspaceMenu}
          title={t("ui_labels", "sidebar.workspaceMenu", "Workspace menu")}
          type="button"
        >
          <span>
            <strong>{workspace.name}</strong>
          </span>
          <ChevronDown aria-hidden="true" size={16} />
        </button>
        {isWorkspaceMenuOpen ? (
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
                type="button"
              >
                <strong>{item.name}</strong>
                <small>{item.path}</small>
              </button>
            ))}
            <button
              className="workspace-menu-item workspace-menu-item--add"
              onClick={onAddWorkspace}
              type="button"
            >
              <Plus aria-hidden="true" size={14} />
              <span>
                {t("ui_labels", "sidebar.addWorkspace", "Add Workspace")}
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <button
            className="start-new-session-button"
            onClick={onCreateSession}
            title={t(
              "ui_labels",
              "sidebar.startNewSession",
              "Start New Session"
            )}
            type="button"
          >
            <FolderPlus aria-hidden="true" size={16} />
            <span>
              {t("ui_labels", "sidebar.startNewSession", "Start New Session")}
            </span>
          </button>
        </div>

        <nav
          aria-label={t("ui_labels", "sidebar.sessions", "Sessions")}
          className="session-list"
        >
          <SessionTree
            activeSessionId={activeSessionId}
            contextMenuSessionId={menuSessionId}
            onContextMenu={openContextMenu}
            onDetachSession={onDetachSession}
            onSelectSession={(sessionId) => {
              setMenuSessionId(null);
              setConfirmDeleteSessionId(null);
              onSelectSession(sessionId);
            }}
            renderContextMenu={renderContextMenu}
            sessions={sessions}
          />
        </nav>
      </div>

      <button
        className="settings-entry"
        onClick={onOpenSettings}
        title={t("ui_labels", "settings.title", "Settings")}
        type="button"
      >
        <Settings aria-hidden="true" size={16} />
        <span>{t("ui_labels", "settings.title", "Settings")}</span>
      </button>
      {renameTarget && onRenameSession ? (
        <div className="session-rename-layer">
          <button
            aria-label={t("ui_labels", "common.close", "Close rename dialog")}
            className="session-rename-backdrop"
            onClick={() => setRenameTarget(null)}
            type="button"
          />
          <form
            aria-label={t(
              "ui_labels",
              "sidebar.renameSession",
              "Rename session"
            )}
            aria-modal="true"
            className="session-rename-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              submitRename();
            }}
            role="dialog"
          >
            <label htmlFor="session-rename-input">
              {t("ui_labels", "sidebar.sessionName", "Session name")}
            </label>
            <input
              id="session-rename-input"
              maxLength={100}
              onChange={(event) => setRenameDraft(event.target.value)}
              ref={renameInputRef}
              value={renameDraft}
            />
            {renameError ? (
              <small className="session-rename-error">{renameError}</small>
            ) : null}
            <div className="session-rename-actions">
              <button onClick={() => setRenameTarget(null)} type="button">
                {t("ui_labels", "common.cancel", "Cancel")}
              </button>
              <button
                disabled={renamePending || renameDraft.trim().length === 0}
                type="submit"
              >
                {t("ui_labels", "common.save", "Save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
