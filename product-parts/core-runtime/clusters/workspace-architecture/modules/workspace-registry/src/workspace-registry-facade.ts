export interface HarnessWorkspace {
  id: string;
  name: string;
  path: string;
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

export const workspaceRegistryFacade = new WorkspaceRegistryFacade();
