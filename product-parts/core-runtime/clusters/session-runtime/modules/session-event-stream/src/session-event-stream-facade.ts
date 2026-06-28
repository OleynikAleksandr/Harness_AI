import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { ProviderUsageTelemetry } from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";

export type CoreSessionRole = "user" | "assistant" | "system" | "thinking";

export interface CoreSessionMessage {
  id: string;
  role: CoreSessionRole;
  sessionId: string;
  tag?: string;
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
    const events = sessionId
      ? this.events.filter((event) => event.payload.sessionId === sessionId)
      : this.events;
    return coalesceLiveAssistantMessageEvents(events);
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

  deleteSessionEvents(sessionId: string): void {
    const eventFile = this.sessionEventFiles.get(sessionId);
    if (eventFile) {
      if (existsSync(eventFile)) {
        unlinkSync(eventFile);
      }
      this.loadedEventFiles.delete(eventFile);
      this.sessionEventFiles.delete(sessionId);
    }
    // Drop in-memory events so a later append cannot recreate the file.
    for (let index = this.events.length - 1; index >= 0; index -= 1) {
      if (this.events[index].payload.sessionId === sessionId) {
        this.events.splice(index, 1);
      }
    }
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

function coalesceLiveAssistantMessageEvents(
  events: readonly SessionCoreEvent[]
): SessionCoreEvent[] {
  const coalesced: SessionCoreEvent[] = [];
  for (const event of events) {
    const previous = coalesced.at(-1);
    if (
      event.type !== "session:message" ||
      previous?.type !== "session:message" ||
      event.payload.sessionId !== previous.payload.sessionId ||
      !isLiveAssistantMessage(previous.payload, event.payload)
    ) {
      coalesced.push(event);
      continue;
    }
    const nextText =
      previous.payload.id === event.payload.id
        ? event.payload.text
        : `${previous.payload.text}${event.payload.text}`;
    coalesced[coalesced.length - 1] = {
      ...previous,
      payload: {
        ...previous.payload,
        text: nextText,
        timestamp: event.payload.timestamp,
      },
      timestamp: event.timestamp,
    };
  }
  return coalesced;
}

function isLiveAssistantMessage(
  previous: Pick<CoreSessionMessage, "role" | "tag">,
  next: Pick<CoreSessionMessage, "role" | "tag">
): boolean {
  return (
    previous.role === "assistant" &&
    previous.tag === "live" &&
    next.role === "assistant" &&
    next.tag === "live"
  );
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
