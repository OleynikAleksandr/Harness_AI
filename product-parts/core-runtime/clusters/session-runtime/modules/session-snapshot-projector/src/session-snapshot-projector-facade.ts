import {
  type ProviderUsageTelemetry,
  usageContextTelemetryFacade,
} from "../../../../../../provider-runtime/clusters/provider-events-and-translation/modules/usage-context-telemetry/src/usage-context-telemetry-facade.js";
import {
  type HarnessWorkspace,
  workspaceRegistryFacade,
} from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import {
  type HarnessSession,
  sessionRegistryFacade,
} from "../../session-registry/src/session-registry-facade.js";

export interface SessionMessage {
  id: string;
  localizedContent?: string;
  role: "assistant" | "system" | "thinking" | "user";
  tag?: string;
  text: string;
  timestamp: string;
  translationState?: "pending";
}

export interface SessionMessageTranslationPatch {
  localizedContent?: string;
  messageId: string;
  sessionId: string;
  sourceHash: string;
  targetLanguage: string;
}

export type SessionTelemetry = ProviderUsageTelemetry;

export interface SessionSnapshot {
  activeSessionId: string;
  messages: SessionMessage[];
  sessions: HarnessSession[];
  telemetry: SessionTelemetry;
  /** The active project, or `null` when no project is active. */
  workspace: HarnessWorkspace | null;
}

const BOOTSTRAP_MESSAGES: SessionMessage[] = [
  {
    id: "m1",
    role: "user",
    text: "Create Harness AI as a standalone product-development app.",
    timestamp: "2026-06-26T00:00:00.000Z",
  },
  {
    id: "m2",
    role: "assistant",
    text: "Workspace skeleton and development harness are ready. The first Electron session slice is being assembled.",
    timestamp: "2026-06-26T00:01:00.000Z",
  },
];

const TELEMETRY: SessionTelemetry = usageContextTelemetryFacade.createTelemetry(
  {
    provider: "Core Runtime",
    model: "Not connected yet",
    providerId: "core",
    status: "idle",
  }
);

export class SessionSnapshotProjectorFacade {
  applyMessageTranslationPatch(
    messages: readonly SessionMessage[],
    patch: SessionMessageTranslationPatch
  ): SessionMessage[] {
    return messages.map((message) =>
      message.id === patch.messageId
        ? {
            ...message,
            // No `localizedContent`: the translation failed; show the source.
            localizedContent: patch.localizedContent || undefined,
            translationState: undefined,
          }
        : message
    );
  }

  getSnapshot(): SessionSnapshot {
    const workspace = workspaceRegistryFacade.getActiveWorkspace();
    return {
      workspace,
      sessions: workspace
        ? sessionRegistryFacade.getSessions(workspace.id)
        : [],
      activeSessionId: sessionRegistryFacade.getActiveSessionId(),
      messages: BOOTSTRAP_MESSAGES,
      telemetry: TELEMETRY,
    };
  }
}

export const sessionSnapshotProjectorFacade =
  new SessionSnapshotProjectorFacade();
