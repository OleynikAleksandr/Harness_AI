import path from "node:path";

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
    const normalizedPath = path.resolve(workspacePath);
    const existing = this.getKnownWorkspaces().find(
      (workspace) => workspace.path === normalizedPath
    );
    if (existing) {
      return existing;
    }
    const workspace = {
      id: buildWorkspaceId(normalizedPath),
      name: path.basename(normalizedPath) || normalizedPath,
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

function buildWorkspaceId(workspacePath: string): string {
  return `workspace-${Buffer.from(workspacePath)
    .toString("base64url")
    .slice(0, 32)}`;
}

export const workspaceRegistryFacade = new WorkspaceRegistryFacade();
