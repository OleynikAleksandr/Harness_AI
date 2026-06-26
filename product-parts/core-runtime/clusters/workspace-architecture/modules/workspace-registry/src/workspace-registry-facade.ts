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
  getKnownWorkspaces(): HarnessWorkspace[] {
    return [CURRENT_WORKSPACE];
  }

  getActiveWorkspace(): HarnessWorkspace {
    return CURRENT_WORKSPACE;
  }
}

export const workspaceRegistryFacade = new WorkspaceRegistryFacade();
