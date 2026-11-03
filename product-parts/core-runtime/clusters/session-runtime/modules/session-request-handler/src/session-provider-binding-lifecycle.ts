import {
  normalizeProviderSessionStart,
  type ProviderSubagentEvent,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { ReasoningTranslationOverlayFacade } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js";
import type { ProviderSessionBinding } from "../../provider-session-binding/src/provider-session-binding-facade.js";
import type {
  CoreSessionMessage,
  CoreSessionMessageTranslationPatch,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import { buildProviderTurnOptions } from "./provider-turn-options.js";
import { buildSessionProfilePayload } from "./session-profile-resolution.js";
import {
  type ProviderEventRouterContext,
  routeProviderEvent,
} from "./session-provider-event-router.js";
import {
  ADAPTER_NOT_REGISTERED,
  resolveBindingUnavailableMessage,
  stringifyError,
} from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  ProviderRegistryLike,
  ProviderRuntimeBinding,
  ProviderSessionBindingFacadeLike,
} from "./session-request-handler-types.js";
import { resolveWorkflowWorkspaceContext } from "./session-workflow-context.js";

interface SessionProviderBindingLifecycleDependencies {
  readonly bindingFacade: ProviderSessionBindingFacadeLike;
  readonly getSession: (sessionId: string) => CoreSession | undefined;
  readonly handleSubagentEvent: (
    sessionId: string,
    event: ProviderSubagentEvent
  ) => void;
  readonly providerRegistry: ProviderRegistryLike;
  readonly publishBinding: (binding: ProviderSessionBinding) => void;
  readonly publishError: (sessionId: string, error: string) => void;
  readonly publishMessage: (
    message: CoreSessionMessage
  ) => CoreSessionMessage | null;
  readonly publishTranslationPatch: (
    payload: CoreSessionMessageTranslationPatch
  ) => void;
  readonly publishTurnState: (
    sessionId: string,
    state: "idle" | "running"
  ) => void;
  readonly reasoningTranslation: ReasoningTranslationOverlayFacade;
  readonly recordAppliedProfileApplication: (
    sessionId: string,
    appliedProfileApplication?: Readonly<Record<string, unknown>>
  ) => void;
  /** Workflow Kit recovery packet for a start or resume; defaults to the Kit host. */
  readonly resolveWorkspaceContext?: (
    session: CoreSession
  ) => Promise<string | undefined>;
  readonly runtimeBindings: Map<string, ProviderRuntimeBinding>;
  readonly updateTelemetryFromProvider: (
    sessionId: string,
    event: unknown
  ) => void;
}

export class SessionProviderBindingLifecycle {
  private readonly deps: SessionProviderBindingLifecycleDependencies;

  constructor(deps: SessionProviderBindingLifecycleDependencies) {
    this.deps = deps;
  }

  async bindProviderSession(session: CoreSession): Promise<void> {
    const adapter = this.deps.providerRegistry.getAdapter(session.providerId);
    if (!adapter) {
      this.deps.publishBinding(
        this.deps.bindingFacade.markFailed(
          session.id,
          session.providerId,
          ADAPTER_NOT_REGISTERED
        )
      );
      this.deps.publishError(session.id, ADAPTER_NOT_REGISTERED);
      return;
    }
    try {
      await adapter.initialize?.();
      const profilePayload = buildSessionProfilePayload(session.appliedProfile);
      const workspaceContext = await (
        this.deps.resolveWorkspaceContext ?? resolveWorkflowWorkspaceContext
      )(session);
      const startOptions =
        session.appliedProfile || workspaceContext
          ? {
              ...(session.appliedProfile
                ? {
                    profile: profilePayload,
                    profileKind: session.appliedProfile.kind,
                  }
                : {}),
              ...(workspaceContext ? { workspaceContext } : {}),
            }
          : undefined;
      const startOutcome =
        session.providerSessionId && adapter.resumeSession
          ? await adapter.resumeSession(
              session.providerSessionId,
              session.workspacePath,
              startOptions
            )
          : await adapter.createSession(session.workspacePath, startOptions);
      const { appliedProfileApplication, providerSessionId } =
        normalizeProviderSessionStart(startOutcome);
      this.deps.recordAppliedProfileApplication(
        session.id,
        appliedProfileApplication
      );
      const unsubscribe = adapter.subscribe(providerSessionId, (event) =>
        this.handleProviderEvent(session.id, event)
      );
      this.deps.runtimeBindings.set(session.id, {
        adapter,
        providerSessionId,
        unsubscribe,
      });
      this.deps.publishBinding(
        this.deps.bindingFacade.markReady(
          session.id,
          session.providerId,
          providerSessionId
        )
      );
      this.refreshUsageLimits(session.id).catch(() => undefined);
    } catch (error) {
      this.deps.publishBinding(
        this.deps.bindingFacade.markFailed(
          session.id,
          session.providerId,
          stringifyError(error)
        )
      );
      this.deps.publishError(session.id, stringifyError(error));
    }
  }

  async dispatchProviderMessage(
    session: CoreSession,
    text: string
  ): Promise<void> {
    let binding = this.deps.runtimeBindings.get(session.id);
    if (!binding) {
      await this.bindProviderSession(session);
      binding = this.deps.runtimeBindings.get(session.id);
    }
    if (!binding) {
      throw new Error(
        resolveBindingUnavailableMessage(
          this.deps.bindingFacade.getBinding(session.id)
        )
      );
    }
    await binding.adapter.sendMessage(
      binding.providerSessionId,
      text,
      buildProviderTurnOptions(session)
    );
  }

  adoptProviderSession(
    childSession: CoreSession,
    parentSession: CoreSession
  ): void {
    const providerSessionId = childSession.providerSessionId;
    if (!providerSessionId) {
      return;
    }
    const existing = this.deps.runtimeBindings.get(childSession.id);
    if (existing?.providerSessionId === providerSessionId) {
      return;
    }
    const parentBinding = this.deps.runtimeBindings.get(parentSession.id);
    if (!parentBinding) {
      return;
    }
    existing?.unsubscribe();
    const unsubscribe = parentBinding.adapter.subscribe(
      providerSessionId,
      (event) => this.handleProviderEvent(childSession.id, event)
    );
    this.deps.runtimeBindings.set(childSession.id, {
      adapter: parentBinding.adapter,
      providerSessionId,
      unsubscribe,
    });
    this.deps.publishBinding(
      this.deps.bindingFacade.markReady(
        childSession.id,
        childSession.providerId,
        providerSessionId
      )
    );
  }

  async refreshUsageLimits(sessionId: string): Promise<void> {
    const session = this.deps.getSession(sessionId);
    const binding = this.deps.runtimeBindings.get(sessionId);
    if (!(session?.workspacePath && binding?.adapter.refreshUsageLimits)) {
      return;
    }
    await binding.adapter.refreshUsageLimits({
      broadcast: (event) => this.handleProviderEvent(sessionId, event),
      providerSessionId: binding.providerSessionId,
      runtimeSessionId: sessionId,
      workspacePath: session.workspacePath,
    });
  }

  private handleProviderEvent(sessionId: string, event: unknown): void {
    routeProviderEvent(this.providerEventRouterContext(), sessionId, event);
  }

  private providerEventRouterContext(): ProviderEventRouterContext {
    return {
      getBinding: (sessionId) => this.deps.runtimeBindings.get(sessionId),
      getSession: this.deps.getSession,
      handleSubagentEvent: this.deps.handleSubagentEvent,
      markBindingReady: (sessionId, providerId, providerSessionId) =>
        this.deps.publishBinding(
          this.deps.bindingFacade.markReady(
            sessionId,
            providerId,
            providerSessionId
          )
        ),
      publishError: this.deps.publishError,
      publishMessage: this.deps.publishMessage,
      publishTranslationPatch: this.deps.publishTranslationPatch,
      publishTurnState: this.deps.publishTurnState,
      reasoningTranslation: this.deps.reasoningTranslation,
      refreshUsageLimits: (sessionId) =>
        this.refreshUsageLimits(sessionId).catch(() => undefined),
      setBinding: (sessionId, binding) =>
        this.deps.runtimeBindings.set(sessionId, binding),
      updateTelemetry: this.deps.updateTelemetryFromProvider,
    };
  }
}
