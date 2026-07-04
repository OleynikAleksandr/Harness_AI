import { resolveCodexReasoningEffort } from "../../../../settings-and-localization/modules/settings-store/src/settings-normalization.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { CoreSession } from "./session-request-handler-facade.js";

export function buildProviderTurnOptions(
  session: CoreSession
): Record<string, unknown> {
  const settings = settingsStoreFacade.getSettings(session.workspacePath);
  if (session.providerId === "claude") {
    const claude = settings.providers.claude;
    const reasoningEffort =
      claude.thinkingByModel[session.model] ?? claude.thinking.effort;
    return {
      model: session.model,
      ...(claude.thinking.enabled ? { reasoningEffort } : {}),
      thinkingDisplaySyncEnabled: claude.thinkingDisplaySyncEnabled,
      thinkingEnabled: claude.thinking.enabled,
    };
  }
  if (session.providerId === "kimi") {
    const kimi = settings.providers.kimi;
    return {
      model: session.model,
      thinkingDisplaySyncEnabled: kimi.thinkingDisplaySyncEnabled,
      thinkingEnabled: kimi.thinkingEnabled,
    };
  }
  if (session.providerId === "glm-native") {
    const glmNative = settings.providers.glmNative;
    return {
      model: session.model,
      reasoningEffort: glmNative.reasoningEffort,
      thinkingDisplaySyncEnabled: glmNative.thinkingDisplaySyncEnabled,
      thinkingEnabled: glmNative.thinkingEnabled,
    };
  }
  if (session.providerId === "openrouter") {
    return {
      endpointTag: settings.providers.openRouter.endpointTag,
      model: session.model,
    };
  }
  if (session.providerId !== "codex") {
    return { model: session.model };
  }
  const codex = settings.providers.codex;
  const reasoningEffort = resolveCodexReasoningEffort(
    session.model,
    codex.reasoningByModel[session.model]
  );
  return {
    model: session.model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    reasoningSummaryEnabled: codex.reasoningSummaryEnabled,
  };
}
