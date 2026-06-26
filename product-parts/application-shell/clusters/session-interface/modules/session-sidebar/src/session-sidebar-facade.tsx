import { ChevronDown, Edit3, FolderPlus, Settings } from "lucide-react";
import type { HarnessSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-registry/src/session-registry-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";

interface SessionSidebarProps {
  activeSessionId: string;
  onCreateSession: () => void;
  onOpenSettings: () => void;
  onSelectSession: (sessionId: string) => void;
  sessions: HarnessSession[];
  workspace: HarnessWorkspace;
}

export function SessionSidebarFacade({
  workspace,
  sessions,
  activeSessionId,
  onCreateSession,
  onOpenSettings,
  onSelectSession,
}: SessionSidebarProps) {
  return (
    <aside aria-label="Workspace sessions" className="session-sidebar">
      <button
        className="workspace-switcher"
        title="Workspace menu"
        type="button"
      >
        <span>
          <strong>{workspace.name}</strong>
          <small>{workspace.path}</small>
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Sessions</span>
          <button
            className="icon-button"
            onClick={onCreateSession}
            title="New session"
            type="button"
          >
            <FolderPlus aria-hidden="true" size={16} />
          </button>
        </div>

        <nav aria-label="Sessions" className="session-list">
          {sessions.map((session) => (
            <button
              className={
                session.id === activeSessionId
                  ? "session-list-item is-active"
                  : "session-list-item"
              }
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              title={session.title}
              type="button"
            >
              <span>{session.title}</span>
              <Edit3 aria-hidden="true" size={14} />
            </button>
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
