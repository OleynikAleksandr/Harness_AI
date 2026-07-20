import {
  isProviderInteractionRequestEvent,
  isProviderInteractionResolvedEvent,
  isProviderSubagentEvent,
  type ProviderSubagentEvent,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type { ReasoningTranslationOverlayFacade } from "../../../../settings-and-localization/modules/reasoning-translation-overlay/src/reasoning-translation-overlay-facade.js";
import type {
  CoreSessionMessage,
  CoreSessionMessageTranslationPatch,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import { sessionReasoningDisplayFacade } from "../../session-reasoning-display/src/session-reasoning-display-facade.js";
import { profileCreatorResultHandler } from "./profile-creator-result-handler.js";
import { readPromotedProviderSessionId } from "./provider-session-id-promotion.js";
import { sessionProviderInteractionLifecycle } from "./session-provider-interaction-lifecycle.js";
import { resolveReasoningTranslationSettingsSnapshot } from "./session-reasoning-translation-settings.js";
import {
  isRecord,
  readString,
} from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  ProviderRuntimeBinding,
} from "./session-request-handler-types.js";

export interface ProviderEventRouterContext {
  readonly getBinding: (
    sessionId: string
  ) => ProviderRuntimeBinding | undefined;
  readonly getSession: (sessionId: string) => CoreSession | undefined;
  readonly handleSubagentEvent?: (
    sessionId: string,
    event: ProviderSubagentEvent
  ) => void;
  readonly markBindingReady: (
    sessionId: string,
    providerId: CoreSession["providerId"],
    providerSessionId: string
  ) => void;
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
  readonly refreshUsageLimits: (sessionId: string) => void;
  readonly setBinding: (
    sessionId: string,
    binding: ProviderRuntimeBinding
  ) => void;
  readonly updateTelemetry: (sessionId: string, event: unknown) => void;
}

export function routeProviderEvent(
  context: ProviderEventRouterContext,
  sessionId: string,
  event: unknown
): void {
  if (!isRecord(event)) {
    return;
  }
  if (profileCreatorResultHandler.handle(context, sessionId, event)) {
    return;
  }
  if (isProviderSubagentEvent(event)) {
    context.handleSubagentEvent?.(sessionId, event);
    return;
  }
  if (isProviderInteractionRequestEvent(event)) {
    const binding = context.getBinding(sessionId);
    if (binding) {
      sessionProviderInteractionLifecycle.capture(sessionId, event, binding);
    }
    return;
  }
  if (isProviderInteractionResolvedEvent(event)) {
    sessionProviderInteractionLifecycle.resolveFromProvider(sessionId, event);
    return;
  }
  context.updateTelemetry(sessionId, event);
  if (typeof event.type !== "string") {
    return;
  }
  const promotedProviderSessionId = readPromotedProviderSessionId(event);
  if (promotedProviderSessionId) {
    promoteProviderSessionId(context, sessionId, promotedProviderSessionId);
    return;
  }
  const displayMessages =
    sessionReasoningDisplayFacade.projectProviderEvent(event);
  if (displayMessages.length > 0) {
    const session = context.getSession(sessionId);
    context.reasoningTranslation.publishDisplayMessages({
      displayMessages,
      publishMessage: (message) => context.publishMessage(message),
      publishPatch: (payload) => context.publishTranslationPatch(payload),
      sessionId,
      settings: resolveReasoningTranslationSettingsSnapshot(
        session?.workspacePath
      ),
      workspacePath: session?.workspacePath,
    });
    return;
  }
  if (event.type === "turn_started") {
    context.publishTurnState(sessionId, "running");
    return;
  }
  if (event.type === "turn_completed") {
    context.publishTurnState(sessionId, "idle");
    context.refreshUsageLimits(sessionId);
    return;
  }
  if (event.type === "turn_failed") {
    context.publishTurnState(sessionId, "idle");
    return;
  }
  if (event.type === "stream_error") {
    context.publishTurnState(sessionId, "idle");
    context.publishError(
      sessionId,
      readString(event.message) ?? "Provider turn failed"
    );
  }
}

function promoteProviderSessionId(
  context: ProviderEventRouterContext,
  sessionId: string,
  promotedProviderSessionId: string
): void {
  const session = context.getSession(sessionId);
  const binding = context.getBinding(sessionId);
  if (
    session &&
    binding &&
    binding.providerSessionId !== promotedProviderSessionId
  ) {
    context.setBinding(sessionId, {
      ...binding,
      providerSessionId: promotedProviderSessionId,
    });
    context.markBindingReady(
      sessionId,
      session.providerId,
      promotedProviderSessionId
    );
  }
}
