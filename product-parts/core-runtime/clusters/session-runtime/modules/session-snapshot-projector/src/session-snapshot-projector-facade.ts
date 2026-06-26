import {
  type HarnessWorkspace,
  workspaceRegistryFacade
} from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import {
  type HarnessSession,
  sessionRegistryFacade
} from "../../session-registry/src/session-registry-facade.js";

export interface SessionMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface SessionTelemetry {
  provider: string;
  model: string;
  status: "idle" | "running" | "stopped";
  contextWindow: string;
  limitState: string;
}

export interface SessionSnapshot {
  workspace: HarnessWorkspace;
  sessions: HarnessSession[];
  activeSessionId: string;
  messages: SessionMessage[];
  telemetry: SessionTelemetry;
}

const BOOTSTRAP_MESSAGES: SessionMessage[] = [
  {
    id: "m1",
    role: "user",
    text: "Create Harness AI as a standalone product-development app.",
    timestamp: "2026-06-26T00:00:00.000Z"
  },
  {
    id: "m2",
    role: "assistant",
    text: "Workspace skeleton and development harness are ready. The first Electron session slice is being assembled.",
    timestamp: "2026-06-26T00:01:00.000Z"
  }
];

const TELEMETRY: SessionTelemetry = {
  provider: "Core Runtime",
  model: "Not connected yet",
  status: "idle",
  contextWindow: "Pending provider selection",
  limitState: "No active turn"
};

export class SessionSnapshotProjectorFacade {
  getSnapshot(): SessionSnapshot {
    const workspace = workspaceRegistryFacade.getActiveWorkspace();
    return {
      workspace,
      sessions: sessionRegistryFacade.getSessions(workspace.id),
      activeSessionId: sessionRegistryFacade.getActiveSessionId(),
      messages: BOOTSTRAP_MESSAGES,
      telemetry: TELEMETRY
    };
  }
}

export const sessionSnapshotProjectorFacade =
  new SessionSnapshotProjectorFacade();
