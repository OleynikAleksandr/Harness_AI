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
  const [builtInWorkspaceId, setBuiltInWorkspaceId] = useState("");
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    initialWorkspace;

  /** Applies the Core list at start-up; returns the workspace to show. */
  const applyWorkspaceList = useCallback(
    (snapshot: {
      activeWorkspaceId: string;
      builtInWorkspaceId?: string;
      workspaces: HarnessWorkspace[];
    }): HarnessWorkspace => {
      setWorkspaces(snapshot.workspaces);
      setBuiltInWorkspaceId(snapshot.builtInWorkspaceId ?? "");
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

  /**
   * Removes a project from the app through Core and mirrors the new list;
   * when Core activated another workspace, its data is reloaded. Resolves to
   * an error text for the menu, or null.
   */
  async function removeWorkspace(workspaceId: string): Promise<string | null> {
    const result = await window.harnessCore?.removeWorkspace(workspaceId);
    if (!result) {
      return "Core is not available.";
    }
    if (!result.ok) {
      return result.error;
    }
    setWorkspaces(result.workspaces);
    setBuiltInWorkspaceId(result.builtInWorkspaceId);
    const active = result.workspaces.find(
      (item) => item.id === result.activeWorkspaceId
    );
    if (active && active.id !== activeWorkspaceId) {
      setActiveWorkspaceId(active.id);
      await onWorkspaceActivated(active);
    }
    return null;
  }

  return {
    activateWorkspace,
    activeWorkspace,
    activeWorkspaceId,
    applyWorkspaceList,
    builtInWorkspaceId,
    closeWorkspaceMenu: () => setIsWorkspaceMenuOpen(false),
    isWorkspaceMenuOpen,
    removeWorkspace,
    selectWorkspace,
    toggleWorkspaceMenu: () => setIsWorkspaceMenuOpen((current) => !current),
    workspaces,
  };
}
