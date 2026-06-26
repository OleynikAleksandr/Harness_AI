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
    };

export type SessionCoreEventListener = (event: SessionCoreEvent) => void;

export class SessionEventStreamFacade {
  private readonly events: SessionCoreEvent[] = [];
  private readonly listeners = new Set<SessionCoreEventListener>();

  publish(event: SessionCoreEvent): void {
    this.events.push(event);
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

  clear(): void {
    this.events.length = 0;
    this.listeners.clear();
  }
}

export const sessionEventStreamFacade = new SessionEventStreamFacade();
