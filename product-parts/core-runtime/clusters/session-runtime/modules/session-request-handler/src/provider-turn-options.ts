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
  return {
    model: session.model,
    reasoningEffort: codex.reasoningByModel[session.model] ?? "medium",
    reasoningSummaryEnabled: codex.reasoningSummaryEnabled,
  };
}
