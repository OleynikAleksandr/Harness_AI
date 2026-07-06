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
  if (session.providerId !== "codex" && session.providerId !== "codex-uc") {
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
