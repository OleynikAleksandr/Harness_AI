import {
  type ProviderUsageTelemetry,
  usageContextTelemetryFacade,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import type { CoreSessionMessage } from "../../session-event-stream/src/session-event-stream-facade.js";
import { readWorkspaceSessionIndex } from "./session-history-store.js";
import type {
  CoreSession,
  SessionEventStreamLike,
} from "./session-request-handler-types.js";

export function restoreSessionHistory(params: {
  eventStream: SessionEventStreamLike;
  messagesBySession: Map<string, CoreSessionMessage[]>;
  sessions: Map<string, CoreSession>;
  telemetryBySession: Map<string, ProviderUsageTelemetry>;
  workspaces: { path: string }[];
}): void {
  const restoredSessions = params.workspaces.flatMap((workspace) =>
    readWorkspaceSessionIndex(workspace.path)
  );
  params.eventStream.configureSessionHistory?.(restoredSessions);
  for (const session of restoredSessions) {
    params.sessions.set(session.id, session);
    params.messagesBySession.set(
      session.id,
      readRememberedMessages(params.eventStream, session.id)
    );
    params.telemetryBySession.set(
      session.id,
      usageContextTelemetryFacade.createTelemetry({
        model: session.model,
        provider: session.providerName,
        providerId: session.providerId,
        status: "idle",
      })
    );
  }
}

export function restoreTelemetryHistory(params: {
  sessions: ReadonlyMap<string, CoreSession>;
  telemetryBySession: Map<string, ProviderUsageTelemetry>;
  telemetryHistory: ReadonlyMap<string, ProviderUsageTelemetry>;
}): void {
  for (const [sessionId, telemetry] of params.telemetryHistory) {
    if (params.sessions.has(sessionId)) {
      params.telemetryBySession.set(
        sessionId,
        usageContextTelemetryFacade.applyStatus(
          telemetry,
          telemetry.status ?? "idle"
        )
      );
    }
  }
}

export { writeWorkspaceSessionIndex } from "./session-history-store.js";

function readRememberedMessages(
  eventStream: SessionEventStreamLike,
  sessionId: string
): CoreSessionMessage[] {
  return (
    eventStream
      .listEvents?.(sessionId)
      .filter((event) => event.type === "session:message")
      .map((event) => event.payload) ?? []
  );
}
