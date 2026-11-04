export interface HarnessWorkspace {
  id: string;
  name: string;
  path: string;
}

export interface WorkspaceRegistrySnapshot {
  activeWorkspaceId: string;
  workspaces: HarnessWorkspace[];
}

const CURRENT_WORKSPACE: HarnessWorkspace = {
  id: "harness-ai-local",
  name: "Harness AI",
  path: "/Users/oleksandroliinyk/VSCODE/harness-ai",
};
const TRAILING_SLASHES_PATTERN = /\/+$/u;
const WORKSPACE_ID_MODULO = 1_000_000_007;

export class WorkspaceRegistryFacade {
  private activeWorkspaceId = CURRENT_WORKSPACE.id;
  private readonly workspaces = new Map<string, HarnessWorkspace>([
    [CURRENT_WORKSPACE.id, CURRENT_WORKSPACE],
  ]);

  getKnownWorkspaces(): HarnessWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  getActiveWorkspace(): HarnessWorkspace {
    return (
      this.workspaces.get(this.activeWorkspaceId) ??
      this.workspaces.get(CURRENT_WORKSPACE.id) ??
      CURRENT_WORKSPACE
    );
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

  isBuiltInWorkspace(workspaceId: string): boolean {
    return workspaceId === CURRENT_WORKSPACE.id;
  }

  /**
   * Forgets a known workspace (the project is removed from the app, not from
   * disk). The built-in workspace stays; it becomes active when the active
   * workspace is removed.
   */
  removeWorkspace(workspaceId: string): HarnessWorkspace {
    if (this.isBuiltInWorkspace(workspaceId)) {
      throw new Error("The built-in workspace cannot be removed.");
    }
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Unknown workspace: ${workspaceId}`);
    }
    this.workspaces.delete(workspaceId);
    if (this.activeWorkspaceId === workspaceId) {
      this.activeWorkspaceId = CURRENT_WORKSPACE.id;
    }
    return workspace;
  }

  restoreSnapshot(snapshot: WorkspaceRegistrySnapshot): void {
    this.workspaces.clear();
    this.workspaces.set(CURRENT_WORKSPACE.id, CURRENT_WORKSPACE);
    for (const workspace of snapshot.workspaces) {
      if (isWorkspace(workspace)) {
        this.workspaces.set(workspace.id, workspace);
      }
    }
    this.activeWorkspaceId = this.workspaces.has(snapshot.activeWorkspaceId)
      ? snapshot.activeWorkspaceId
      : CURRENT_WORKSPACE.id;
  }

  getSnapshot(): WorkspaceRegistrySnapshot {
    return {
      activeWorkspaceId: this.getActiveWorkspace().id,
      workspaces: this.getKnownWorkspaces(),
    };
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
