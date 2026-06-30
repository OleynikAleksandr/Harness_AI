import {
  ChevronDown,
  ExternalLink,
  FolderPlus,
  Plus,
  Settings,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";

interface SessionSidebarProps {
  activeSessionId: string;
  isWorkspaceMenuOpen: boolean;
  onAddWorkspace: () => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onDetachSession: (sessionId: string) => void;
  onOpenNextSessionMode: () => void;
  onOpenSettings: () => void;
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
  onOpenNextSessionMode,
  onOpenSettings,
  onSelectSession,
  onSelectWorkspace,
  onToggleWorkspaceMenu,
}: SessionSidebarProps) {
  const { t } = useBrowserLocalization();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<
    string | null
  >(null);

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

      <button
        className="next-session-mode-button"
        onClick={onOpenNextSessionMode}
        title={t(
          "ui_helper_text",
          "sidebar.nextSessionMode.description",
          "Next session starts as Native Raw"
        )}
        type="button"
      >
        <span>
          {t("ui_labels", "sidebar.nextSessionMode", "Next Session Mode")}
        </span>
        <strong>Native · Raw</strong>
      </button>

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
          {sessions.map((session) => (
            <div
              className={
                session.id === activeSessionId
                  ? "session-list-row is-active"
                  : "session-list-row"
              }
              key={session.id}
            >
              <div className="session-list-item">
                <button
                  className="session-list-title"
                  onClick={() => {
                    setMenuSessionId(null);
                    setConfirmDeleteSessionId(null);
                    onSelectSession(session.id);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setConfirmDeleteSessionId(null);
                    setMenuSessionId(session.id);
                  }}
                  title={session.title}
                  type="button"
                >
                  <span>{session.title}</span>
                </button>
                <button
                  className="session-list-detach"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDetachSession(session.id);
                  }}
                  title={t(
                    "ui_labels",
                    "sidebar.detachSession",
                    "Detach session"
                  )}
                  type="button"
                >
                  <ExternalLink aria-hidden="true" size={14} />
                </button>
              </div>
              {menuSessionId === session.id ? (
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
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuSessionId(null);
                            setConfirmDeleteSessionId(null);
                          }}
                          type="button"
                        >
                          {t("ui_labels", "common.cancel", "Cancel")}
                        </button>
                        <button
                          className="is-danger"
                          onClick={(event) => {
                            event.stopPropagation();
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
                    <button
                      className="is-danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDeleteSessionId(session.id);
                      }}
                      type="button"
                    >
                      {t("ui_labels", "common.delete", "Delete")}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ))}
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
    </aside>
  );
}
