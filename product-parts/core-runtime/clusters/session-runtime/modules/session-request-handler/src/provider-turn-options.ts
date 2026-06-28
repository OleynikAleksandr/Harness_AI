import { resolveCodexReasoningEffort } from "../../../../settings-and-localization/modules/settings-store/src/settings-normalization.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import type { CoreSession } from "./session-request-handler-facade.js";

export function buildProviderTurnOptions(
  session: CoreSession
): Record<string, unknown> {
  if (session.providerId !== "codex") {
    return { model: session.model };
  }
  const codex = settingsStoreFacade.getSettings(session.workspacePath).providers
    .codex;
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
