import type { ProviderAdapter } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import type { SessionCoreEvent } from "../../session-event-stream/src/session-event-stream-facade.js";
import type { NextSessionMode } from "./next-session-mode.js";

/**
 * Immutable applied profile snapshot captured exactly once at session create
 * (docs/architecture/SessionProfiles.md). Resume rebuilds adapter input from
 * this snapshot and never rereads user-editable profile files. Sessions
 * persisted before this feature have no snapshot and resolve to legacy
 * no-payload behavior.
 */
export interface AppliedProfileSnapshot {
  // Provider-specific application details returned by the adapter
  // (ProviderSessionStartResult); recorded once on the first bind.
  appliedProfileApplication?: Readonly<Record<string, unknown>>;
  readonly contentHash?: string;
  readonly kind: "managed" | "native";
  readonly profileId: string;
  readonly profileName: string;
  readonly prompt?: string;
  readonly requestTemplate?: Readonly<Record<string, unknown>>;
  readonly toolingCategories?: Readonly<Record<string, boolean>>;
  readonly tools?: readonly Readonly<Record<string, unknown>>[];
}

export interface CoreSession {
  // Absent on sessions created before session profiles existed (= legacy).
  appliedProfile?: AppliedProfileSnapshot;
  createdAt: string;
  id: string;
  model: string;
  nextSessionMode: NextSessionMode;
  providerId: ProviderId;
  providerName: string;
  // Provider's own session id (e.g. Codex rollout id); used to locate and delete
  // provider-owned artifacts when the session is removed.
  providerSessionId?: string;
  title: string;
  updatedAt: string;
  workspaceId: string;
  workspacePath?: string;
}

export interface CreateCoreSessionRequest {
  model: string;
  nextSessionMode?: unknown;
  providerId: ProviderId;
  providerName: string;
  title?: string;
  workspaceId: string;
  workspacePath?: string;
}

export interface SendCoreMessageRequest {
  sessionId: string;
  text: string;
}

export interface RollbackCoreSessionRequest {
  numTurns?: number;
  preserveFirstUserTurns?: number;
  sessionId: string;
}

export type CoreSessionActionResult =
  | { ok: true; session: CoreSession }
  | { error: string; ok: false };

export type DeleteSessionResult = { ok: true } | { error: string; ok: false };

export interface SessionRequestHandlerDependencies {
  bindingFacade?: ProviderSessionBindingFacadeLike;
  eventStream?: SessionEventStreamLike;
  profileResolver?: import("./session-profile-resolution.js").SessionProfileResolverLike;
  providerRegistry?: ProviderRegistryLike;
}

export interface ProviderSessionBindingFacadeLike {
  createPending(
    sessionId: string,
    providerId: ProviderId
  ): ProviderSessionBinding;
  getBinding(sessionId: string): ProviderSessionBinding | null;
  markFailed(
    sessionId: string,
    providerId: ProviderId,
    error: string
  ): ProviderSessionBinding;
  markReady(
    sessionId: string,
    providerId: ProviderId,
    providerSessionId: string
  ): ProviderSessionBinding;
}

export interface SessionEventStreamLike {
  listEvents?(sessionId?: string): SessionCoreEvent[];
  publish(event: SessionCoreEvent): void;
  rememberSession?(session: CoreSession): void;
}

export interface ProviderRegistryLike {
  getAdapter(providerId: ProviderId): ProviderAdapter | null;
}

export interface ProviderRuntimeBinding {
  adapter: ProviderAdapter;
  providerSessionId: string;
  unsubscribe: () => void;
}
