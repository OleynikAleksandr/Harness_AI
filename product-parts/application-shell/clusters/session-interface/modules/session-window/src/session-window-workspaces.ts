import { useCallback, useState } from "react";
import type { HarnessWorkspace } from "../../../../../../core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { DetachedSessionMode } from "./session-window-routing.js";

/** The Core project list as `listWorkspaces` / `removeWorkspace` return it. */
interface WorkspaceListSnapshot {
  activeWorkspaceId: string | null;
  workspaces: HarnessWorkspace[];
}

/**
 * Workspace list, active workspace and workspace menu of the session
 * window. Core owns the registry; this hook only mirrors the Core snapshot
 * and forwards the user's choice. The list may be empty and no project may
 * be active (`activeWorkspace` is then `null`); `isWorkspaceListLoaded`
 * tells the window when the first Core list arrived. `onWorkspaceActivated`
 * reloads the workspace-scoped data (settings, localization, sessions) after
 * a switch, with `null` when Core left no project active.
 */
export function useSessionWindowWorkspaces(options: {
  detachedMode: DetachedSessionMode | null;
  onWorkspaceActivated: (workspace: HarnessWorkspace | null) => Promise<void>;
}) {
  const { detachedMode, onWorkspaceActivated } = options;
  const [workspaces, setWorkspaces] = useState<HarnessWorkspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    detachedMode?.workspaceId ?? null
  );
  const [isWorkspaceListLoaded, setIsWorkspaceListLoaded] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  /** Applies a Core list; returns the workspace to show, or null. */
  const applyWorkspaceList = useCallback(
    (snapshot: WorkspaceListSnapshot): HarnessWorkspace | null => {
      setWorkspaces(snapshot.workspaces);
      const workspaceId =
        detachedMode?.workspaceId ?? snapshot.activeWorkspaceId;
      const workspace =
        snapshot.workspaces.find((item) => item.id === workspaceId) ?? null;
      setActiveWorkspaceId(workspace?.id ?? null);
      setIsWorkspaceListLoaded(true);
      return workspace;
    },
    [detachedMode]
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
   * Core refused a request with `NO_WORKSPACE` (no active project): mirrors
   * the Core list again, so the window shows the start screen.
   */
  function mirrorWorkspaceFailure(code: string | undefined) {
    if (code !== "NO_WORKSPACE") {
      return;
    }
    window.harnessCore
      ?.listWorkspaces()
      .then(applyWorkspaceList)
      .catch(() => undefined);
  }

  /**
   * Removes any project from the app through Core and mirrors the new list.
   * When Core activated another project, or left none active, the
   * workspace data is reloaded. Resolves to an error text for the menu, or
   * null.
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
    const active =
      result.workspaces.find((item) => item.id === result.activeWorkspaceId) ??
      null;
    const nextActiveId = active?.id ?? null;
    if (nextActiveId !== activeWorkspaceId) {
      setActiveWorkspaceId(nextActiveId);
      await onWorkspaceActivated(active);
    }
    return null;
  }

  return {
    activateWorkspace,
    activeWorkspace,
    /** The active project id, `""` without a project. */
    activeWorkspaceId: activeWorkspaceId ?? "",
    applyWorkspaceList,
    closeWorkspaceMenu: () => setIsWorkspaceMenuOpen(false),
    isWorkspaceListLoaded,
    isWorkspaceMenuOpen,
    mirrorWorkspaceFailure,
    removeWorkspace,
    selectWorkspace,
    toggleWorkspaceMenu: () => setIsWorkspaceMenuOpen((current) => !current),
    workspaces,
  };
}
