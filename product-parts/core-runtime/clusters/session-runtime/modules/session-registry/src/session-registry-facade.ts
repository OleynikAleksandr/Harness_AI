export interface HarnessSession {
  id: string;
  title: string;
  updatedAt: string;
  workspaceId: string;
}

const FIRST_SESSION: HarnessSession = {
  id: "session-main",
  title: "Harness AI bootstrap",
  workspaceId: "harness-ai-local",
  updatedAt: "2026-06-26T00:00:00.000Z",
};

export class SessionRegistryFacade {
  getSessions(workspaceId: string): HarnessSession[] {
    return FIRST_SESSION.workspaceId === workspaceId ? [FIRST_SESSION] : [];
  }

  getActiveSessionId(): string {
    return FIRST_SESSION.id;
  }
}

export const sessionRegistryFacade = new SessionRegistryFacade();
