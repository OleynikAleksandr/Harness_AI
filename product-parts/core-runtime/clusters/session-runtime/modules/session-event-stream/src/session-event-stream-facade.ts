import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ProviderUsageTelemetry } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";

export type CoreSessionRole = "user" | "assistant" | "system" | "thinking";

export interface CoreSessionMessage {
  id: string;
  role: CoreSessionRole;
  sessionId: string;
  text: string;
  timestamp: string;
}

export type CoreTurnState = "idle" | "running";

export type SessionCoreEvent =
  | {
      payload: { sessionId: string; state: CoreTurnState };
      timestamp: string;
      type: "session:turn-state";
    }
  | {
      payload: CoreSessionMessage;
      timestamp: string;
      type: "session:message";
    }
  | {
      payload: { error: string; sessionId: string };
      timestamp: string;
      type: "session:error";
    }
  | {
      payload: { sessionId: string; title: string };
      timestamp: string;
      type: "session:created";
    }
  | {
      payload: ProviderSessionBinding;
      timestamp: string;
      type: "session:provider-binding";
    }
  | {
      payload: { sessionId: string; telemetry: ProviderUsageTelemetry };
      timestamp: string;
      type: "session:telemetry";
    };

export type SessionCoreEventListener = (event: SessionCoreEvent) => void;

export interface SessionHistoryRef {
  id: string;
  workspacePath?: string;
}

export class SessionEventStreamFacade {
  private readonly events: SessionCoreEvent[] = [];
  private readonly listeners = new Set<SessionCoreEventListener>();
  private readonly sessionEventFiles = new Map<string, string>();
  private readonly loadedEventFiles = new Set<string>();

  publish(event: SessionCoreEvent): void {
    this.events.push(event);
    this.appendHistoryEvent(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: SessionCoreEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  listEvents(sessionId?: string): SessionCoreEvent[] {
    if (!sessionId) {
      return [...this.events];
    }
    return this.events.filter((event) => event.payload.sessionId === sessionId);
  }

  latestTelemetryBySession(): Map<string, ProviderUsageTelemetry> {
    const telemetryBySession = new Map<string, ProviderUsageTelemetry>();
    for (const event of this.events) {
      if (event.type === "session:telemetry") {
        telemetryBySession.set(
          event.payload.sessionId,
          event.payload.telemetry
        );
      }
    }
    return telemetryBySession;
  }

  clear(): void {
    this.events.length = 0;
    this.listeners.clear();
    this.sessionEventFiles.clear();
    this.loadedEventFiles.clear();
  }

  configureSessionHistory(sessions: SessionHistoryRef[]): void {
    for (const session of sessions) {
      this.rememberSession(session);
      this.loadHistoryEvents(session);
    }
    this.events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  rememberSession(session: SessionHistoryRef): void {
    if (!session.workspacePath) {
      return;
    }
    this.sessionEventFiles.set(
      session.id,
      join(
        session.workspacePath,
        ".harness",
        "sessions",
        "events",
        `${encodeURIComponent(session.id)}.jsonl`
      )
    );
  }

  private appendHistoryEvent(event: SessionCoreEvent): void {
    const eventFile = this.sessionEventFiles.get(event.payload.sessionId);
    if (!eventFile) {
      return;
    }
    mkdirSync(dirname(eventFile), { recursive: true });
    appendFileSync(eventFile, `${JSON.stringify(event)}\n`, "utf8");
  }

  private loadHistoryEvents(session: SessionHistoryRef): void {
    const eventFile = this.sessionEventFiles.get(session.id);
    if (
      !eventFile ||
      this.loadedEventFiles.has(eventFile) ||
      !existsSync(eventFile)
    ) {
      return;
    }
    this.loadedEventFiles.add(eventFile);
    for (const line of readFileSync(eventFile, "utf8").split("\n")) {
      const event = parseEvent(line);
      if (event) {
        this.events.push(event);
      }
    }
  }
}

function parseEvent(line: string): SessionCoreEvent | null {
  if (!line.trim()) {
    return null;
  }
  try {
    const value = JSON.parse(line) as SessionCoreEvent;
    return typeof value.timestamp === "string" &&
      typeof value.type === "string" &&
      typeof value.payload?.sessionId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}

export const sessionEventStreamFacade = new SessionEventStreamFacade();
