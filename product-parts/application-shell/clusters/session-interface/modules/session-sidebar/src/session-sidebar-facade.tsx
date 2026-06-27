import {
  ChevronDown,
  ExternalLink,
  FolderPlus,
  Plus,
  Settings,
} from "lucide-react";
import { useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";

interface SessionSidebarProps {
  activeSessionId: string;
  isWorkspaceMenuOpen: boolean;
  onAddWorkspace: () => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onDetachSession: (sessionId: string) => void;
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
  onOpenSettings,
  onSelectSession,
  onSelectWorkspace,
  onToggleWorkspaceMenu,
}: SessionSidebarProps) {
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);
  return (
    <aside aria-label="Workspace sessions" className="session-sidebar">
      <div className="workspace-switcher-wrap">
        <button
          aria-expanded={isWorkspaceMenuOpen}
          className="workspace-switcher"
          onClick={onToggleWorkspaceMenu}
          title="Workspace menu"
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
              <span>Add Workspace</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <button
            className="start-new-session-button"
            onClick={onCreateSession}
            title="Start New Session"
            type="button"
          >
            <FolderPlus aria-hidden="true" size={16} />
            <span>Start New Session</span>
          </button>
        </div>

        <nav aria-label="Sessions" className="session-list">
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
                  onClick={() => onSelectSession(session.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
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
                  title="Detach session"
                  type="button"
                >
                  <ExternalLink aria-hidden="true" size={14} />
                </button>
              </div>
              {menuSessionId === session.id ? (
                <div className="session-context-menu">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuSessionId(null);
                      onDeleteSession(session.id);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </div>

      <button
        className="settings-entry"
        onClick={onOpenSettings}
        title="Settings"
        type="button"
      >
        <Settings aria-hidden="true" size={16} />
        <span>Settings</span>
      </button>
    </aside>
  );
}
