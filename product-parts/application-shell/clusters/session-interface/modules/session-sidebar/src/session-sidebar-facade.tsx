import { ChevronDown, Edit3, FolderPlus, Settings } from "lucide-react";
import type { HarnessSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-registry/src/session-registry-facade.js";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";

interface SessionSidebarProps {
  workspace: HarnessWorkspace;
  sessions: HarnessSession[];
  activeSessionId: string;
}

export function SessionSidebarFacade({
  workspace,
  sessions,
  activeSessionId
}: SessionSidebarProps) {
  return (
    <aside className="session-sidebar" aria-label="Workspace sessions">
      <button className="workspace-switcher" type="button" title="Workspace menu">
        <span>
          <strong>{workspace.name}</strong>
          <small>{workspace.path}</small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Sessions</span>
          <button className="icon-button" type="button" title="New session">
            <FolderPlus size={16} aria-hidden="true" />
          </button>
        </div>

        <nav className="session-list" aria-label="Sessions">
          {sessions.map((session) => (
            <button
              className={
                session.id === activeSessionId
                  ? "session-list-item is-active"
                  : "session-list-item"
              }
              key={session.id}
              type="button"
              title={session.title}
            >
              <span>{session.title}</span>
              <Edit3 size={14} aria-hidden="true" />
            </button>
          ))}
        </nav>
      </div>

      <button className="settings-entry" type="button" title="Settings">
        <Settings size={16} aria-hidden="true" />
        <span>Settings</span>
      </button>
    </aside>
  );
}
