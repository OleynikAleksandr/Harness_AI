import { useCallback, useState } from "react";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { DetachedSessionMode } from "./session-window-routing.js";

/**
 * Workspace list, active workspace and workspace menu of the session
 * window. Core owns the registry; this hook only mirrors the Core snapshot
 * and forwards the user's choice. `onWorkspaceActivated` reloads the
 * workspace-scoped data (settings, localization, sessions) after a switch.
 */
export function useSessionWindowWorkspaces(options: {
  detachedMode: DetachedSessionMode | null;
  initialWorkspace: HarnessWorkspace;
  onWorkspaceActivated: (workspace: HarnessWorkspace) => Promise<void>;
}) {
  const { detachedMode, initialWorkspace, onWorkspaceActivated } = options;
  const [workspaces, setWorkspaces] = useState<HarnessWorkspace[]>([
    initialWorkspace,
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    detachedMode?.workspaceId ?? initialWorkspace.id
  );
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    initialWorkspace;

  /** Applies the Core list at start-up; returns the workspace to show. */
  const applyWorkspaceList = useCallback(
    (snapshot: {
      activeWorkspaceId: string;
      workspaces: HarnessWorkspace[];
    }): HarnessWorkspace => {
      setWorkspaces(snapshot.workspaces);
      const workspaceId =
        detachedMode?.workspaceId ?? snapshot.activeWorkspaceId;
      const workspace =
        snapshot.workspaces.find((item) => item.id === workspaceId) ??
        snapshot.workspaces[0] ??
        initialWorkspace;
      setActiveWorkspaceId(workspace.id);
      return workspace;
    },
    [detachedMode, initialWorkspace]
  );

  /** Shows a workspace Core already selected (opened or created project). */
  async function activateWorkspace(workspace: HarnessWorkspace) {
    const snapshot = await window.harnessCore?.listWorkspaces();
    if (snapshot) {
      setWorkspaces(snapshot.workspaces);
    }
    setActiveWorkspaceId(workspace.id);
    setIsWorkspaceMenuOpen(false);
    await onWorkspaceActivated(workspace);
  }

  async function selectWorkspace(workspaceId: string) {
    if (detachedMode) {
      return;
    }
    const result = await window.harnessCore?.selectWorkspace(workspaceId);
    if (!result?.ok) {
      return;
    }
    setActiveWorkspaceId(result.workspace.id);
    setIsWorkspaceMenuOpen(false);
    await onWorkspaceActivated(result.workspace);
  }

  return {
    activateWorkspace,
    activeWorkspace,
    activeWorkspaceId,
    applyWorkspaceList,
    closeWorkspaceMenu: () => setIsWorkspaceMenuOpen(false),
    isWorkspaceMenuOpen,
    selectWorkspace,
    toggleWorkspaceMenu: () => setIsWorkspaceMenuOpen((current) => !current),
    workspaces,
  };
}
