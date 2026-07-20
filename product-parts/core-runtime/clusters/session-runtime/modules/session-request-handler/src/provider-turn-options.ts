import { resolveCodexReasoningEffort } from "../../../../settings-and-localization/modules/settings-store/src/settings-normalization.js";
import { settingsStoreFacade } from "../../../../settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { buildProfileCreatorTurnOptions } from "./session-creation.js";
import type { CoreSession } from "./session-request-handler-facade.js";

export function buildProviderTurnOptions(
  session: CoreSession
): Record<string, unknown> {
  const profileCreatorOptions = buildProfileCreatorTurnOptions(session);
  if (profileCreatorOptions) {
    return profileCreatorOptions;
  }
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
  if (session.providerId === "grok") {
    const grok = settings.providers.grok;
    const reasoningEffort =
      session.reasoningEffort ?? grok.reasoningByModel[session.model];
    return {
      model: session.model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
    };
  }
  if (session.providerId === "kimi-client") {
    // The native driver writes the level into the workspace-home config
    // before the CLI spawns; managed sessions ignore the option today.
    const kimi = settings.providers.kimiClient;
    const reasoningEffort =
      session.reasoningEffort ?? kimi.reasoningByModel[session.model];
    return {
      model: session.model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
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
