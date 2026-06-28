import type { ProviderAdapter } from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { ProviderId } from "../../../../../../provider-runtime/clusters/provider-registry/modules/provider-registry/src/provider-registry-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import type { SessionCoreEvent } from "../../session-event-stream/src/session-event-stream-facade.js";

export interface CoreSession {
  createdAt: string;
  id: string;
  model: string;
  providerId: ProviderId;
  providerName: string;
  title: string;
  updatedAt: string;
  workspaceId: string;
  workspacePath?: string;
}

export interface CreateCoreSessionRequest {
  model: string;
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

export type CoreSessionActionResult =
  | { ok: true; session: CoreSession }
  | { error: string; ok: false };

export type DeleteSessionResult = { ok: true } | { error: string; ok: false };

export interface SessionRequestHandlerDependencies {
  bindingFacade?: ProviderSessionBindingFacadeLike;
  eventStream?: SessionEventStreamLike;
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
