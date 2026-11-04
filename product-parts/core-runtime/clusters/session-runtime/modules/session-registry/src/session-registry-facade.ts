export interface HarnessSession {
  id: string;
  title: string;
  updatedAt: string;
  workspaceId: string;
}

/**
 * Session metadata read by the session snapshot projector. The registry
 * holds no built-in (bootstrap) session: it lists no sessions and has no
 * active session. Core sessions live in the session request handler.
 */
export class SessionRegistryFacade {
  getSessions(_workspaceId: string): HarnessSession[] {
    return [];
  }

  getActiveSessionId(): string {
    return "";
  }
}

export const sessionRegistryFacade = new SessionRegistryFacade();
