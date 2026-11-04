import type { ReasoningTranslationOverlayFacade } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js";
import {
  closeAndCleanupProviderSession,
  collectSessionTreeIds,
} from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  ProviderRegistryLike,
  ProviderRuntimeBinding,
  SessionEventStreamLike,
} from "./session-request-handler-types.js";

/** The in-memory records Core keeps for every session. */
export interface SessionRecordStore {
  readonly messagesBySession: Pick<Map<string, unknown>, "delete">;
  readonly runtimeBindings: Map<string, ProviderRuntimeBinding>;
  readonly sessions: Map<string, CoreSession>;
  readonly telemetryBySession: Pick<Map<string, unknown>, "delete">;
}

export interface SessionTreeDeleteDependencies {
  readonly eventStream: SessionEventStreamLike;
  readonly providerRegistry: ProviderRegistryLike;
  readonly reasoningTranslation: Pick<
    ReasoningTranslationOverlayFacade,
    "deleteSessionOverlays"
  >;
}

function dropSessionRecords(store: SessionRecordStore, sessionId: string) {
  store.runtimeBindings.delete(sessionId);
  store.messagesBySession.delete(sessionId);
  store.telemetryBySession.delete(sessionId);
  store.sessions.delete(sessionId);
}

/**
 * Deletes a session with its subagent tree, children first: provider
 * sessions are closed and their native artifacts removed, and every session
 * drops its persisted event JSONL and reasoning translation overlay, so no
 * orphan artifacts remain.
 */
export function deleteSessionTree(
  store: SessionRecordStore,
  sessionId: string,
  dependencies: SessionTreeDeleteDependencies
): void {
  const sessionIds = collectSessionTreeIds(store.sessions, sessionId)
    .slice()
    .reverse();
  for (const id of sessionIds) {
    const session = store.sessions.get(id);
    if (!session) {
      continue;
    }
    const binding = store.runtimeBindings.get(id);
    closeAndCleanupProviderSession({
      adapter:
        binding?.adapter ??
        dependencies.providerRegistry.getAdapter(session.providerId),
      binding,
      providerSessionId:
        binding?.providerSessionId ?? session.providerSessionId,
      workspacePath: session.workspacePath,
    });
    dependencies.eventStream.deleteSessionEvents?.(id);
    if (session.workspacePath) {
      dependencies.reasoningTranslation.deleteSessionOverlays(
        session.workspacePath,
        id
      );
    }
    dropSessionRecords(store, id);
  }
}

/**
 * Releases every session of one workspace from Core memory (the project was
 * removed from the app): subscriptions and provider sessions are closed and
 * the records dropped. History files in the project stay on disk, so opening
 * the project again restores its sessions. Returns the released session ids.
 */
export function releaseWorkspaceSessions(
  store: SessionRecordStore,
  workspaceId: string
): string[] {
  const released: string[] = [];
  for (const session of Array.from(store.sessions.values())) {
    if (session.workspaceId !== workspaceId) {
      continue;
    }
    closeAndCleanupProviderSession({
      binding: store.runtimeBindings.get(session.id),
    });
    dropSessionRecords(store, session.id);
    released.push(session.id);
  }
  return released;
}
