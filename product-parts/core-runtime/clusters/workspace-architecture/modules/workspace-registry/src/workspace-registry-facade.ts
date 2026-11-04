export interface HarnessWorkspace {
  id: string;
  name: string;
  path: string;
}

export interface WorkspaceRegistrySnapshot {
  /** `null` when no project is active (an empty registry). */
  activeWorkspaceId: string | null;
  workspaces: HarnessWorkspace[];
}

const TRAILING_SLASHES_PATTERN = /\/+$/u;
const WORKSPACE_ID_MODULO = 1_000_000_007;

/**
 * Known projects and the active one. The registry starts empty: there is no
 * built-in project, and no project is active until one is added or restored.
 */
export class WorkspaceRegistryFacade {
  private activeWorkspaceId: string | null = null;
  private readonly workspaces = new Map<string, HarnessWorkspace>();

  getKnownWorkspaces(): HarnessWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  /** The active project, or `null` when none is active. */
  getActiveWorkspace(): HarnessWorkspace | null {
    return this.activeWorkspaceId
      ? (this.workspaces.get(this.activeWorkspaceId) ?? null)
      : null;
  }

  addWorkspace(workspacePath: string): HarnessWorkspace {
    const normalizedPath = normalizeWorkspacePath(workspacePath);
    const existing = this.getKnownWorkspaces().find(
      (workspace) => workspace.path === normalizedPath
    );
    if (existing) {
      return existing;
    }
    const workspace = {
      id: buildWorkspaceId(normalizedPath),
      name: workspaceNameFromPath(normalizedPath),
      path: normalizedPath,
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  selectWorkspace(workspaceId: string): HarnessWorkspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Unknown workspace: ${workspaceId}`);
    }
    this.activeWorkspaceId = workspace.id;
    return workspace;
  }

  /**
   * Forgets a known workspace (the project is removed from the app, not from
   * disk). Removing the active workspace activates the first remaining one,
   * or none when the registry becomes empty.
   */
  removeWorkspace(workspaceId: string): HarnessWorkspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Unknown workspace: ${workspaceId}`);
    }
    this.workspaces.delete(workspaceId);
    if (this.activeWorkspaceId === workspaceId) {
      this.activeWorkspaceId = this.firstWorkspaceId();
    }
    return workspace;
  }

  /**
   * Replaces the registry with a persisted snapshot. Every valid entry is an
   * ordinary project (including an old `harness-ai-local` entry); an unknown
   * active id falls back to the first project, an empty snapshot leaves no
   * project active.
   */
  restoreSnapshot(snapshot: WorkspaceRegistrySnapshot): void {
    this.workspaces.clear();
    const workspaces = Array.isArray(snapshot.workspaces)
      ? snapshot.workspaces
      : [];
    for (const workspace of workspaces) {
      if (isWorkspace(workspace)) {
        this.workspaces.set(workspace.id, workspace);
      }
    }
    const activeId = snapshot.activeWorkspaceId;
    this.activeWorkspaceId =
      typeof activeId === "string" && this.workspaces.has(activeId)
        ? activeId
        : this.firstWorkspaceId();
  }

  getSnapshot(): WorkspaceRegistrySnapshot {
    return {
      activeWorkspaceId: this.getActiveWorkspace()?.id ?? null,
      workspaces: this.getKnownWorkspaces(),
    };
  }

  private firstWorkspaceId(): string | null {
    return this.getKnownWorkspaces()[0]?.id ?? null;
  }
}

function normalizeWorkspacePath(workspacePath: string): string {
  const trimmed = workspacePath.trim().replace(TRAILING_SLASHES_PATTERN, "");
  return trimmed || workspacePath;
}

function workspaceNameFromPath(workspacePath: string): string {
  return workspacePath.split("/").filter(Boolean).at(-1) ?? workspacePath;
}

function buildWorkspaceId(workspacePath: string): string {
  let hash = 0;
  for (const char of workspacePath) {
    hash = (hash * 31 + char.charCodeAt(0)) % WORKSPACE_ID_MODULO;
  }
  return `workspace-${hash.toString(36)}`;
}

function isWorkspace(value: unknown): value is HarnessWorkspace {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as HarnessWorkspace).id === "string" &&
    typeof (value as HarnessWorkspace).name === "string" &&
    typeof (value as HarnessWorkspace).path === "string"
  );
}

export const workspaceRegistryFacade = new WorkspaceRegistryFacade();
