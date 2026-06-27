export interface DetachedSessionMode {
  sessionId: string;
  workspaceId: string;
}

export function resolveDetachedSessionMode(): DetachedSessionMode | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "detached-session") {
    return null;
  }
  const sessionId = params.get("sessionId");
  const workspaceId = params.get("workspaceId");
  return sessionId && workspaceId ? { sessionId, workspaceId } : null;
}
