import { ChevronRight } from "lucide-react";
import { type CSSProperties, useState } from "react";
import type { CoreSession } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import type { SessionTelemetry } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.js";
import type { TurnTiming } from "../../../../../../core-runtime/clusters/session-runtime/modules/turn-timing/src/turn-timing-facade.js";
import type { HarnessSettings } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-store-facade.js";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  SessionTotalTimer,
  TurnTimer,
} from "../../turn-timer/src/turn-timer-facade.js";
import { SessionInputTextarea } from "./session-input-textarea.js";

export { DialogPanel } from "./session-dialog-panel.js";
export function SessionIdPanel({
  session,
  telemetry,
}: {
  session: CoreSession | undefined;
  telemetry: SessionTelemetry;
}) {
  const { t } = useBrowserLocalization();
  const idLabel = resolveIdLabel(session, telemetry, t);
  return (
    <section
      aria-label={t("ui_labels", "session.identifier", "Session identifier")}
      className="session-panel session-id-bar"
    >
      <div className="session-id-bar__identity">
        <span className="session-id-bar__id">{idLabel}</span>
        <SessionProfileChip session={session} />
      </div>
      <div className="session-id-bar__limits">
        {telemetry.limitRows.map((row) => (
          <LimitRow key={row.label} row={row} />
        ))}
      </div>
    </section>
  );
}
export function ReferenceInputPanel({
  disabled,
  onStop,
  onSubmit,
  timing,
}: {
  disabled: boolean;
  onStop?: () => void;
  onSubmit: (text: string) => void | Promise<void>;
  timing: TurnTiming;
}) {
  const { t } = useBrowserLocalization();
  const [draft, setDraft] = useState("");
  const canSubmit = draft.trim().length > 0 && !disabled;
  const waitCopy = disabled
    ? t(
        "messages_for_the_user",
        "session.input.wait",
        "Agent is working... Please wait."
      )
    : null;
  const showStop = disabled && Boolean(onStop);
  const submit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit(draft.trim());
    setDraft("");
  };
  return (
    <form
      aria-label={t("ui_labels", "session.input", "Message input")}
      className={
        waitCopy
          ? "session-input session-input--wait-copy session-panel"
          : "session-input session-panel"
      }
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="session-input__row">
        <SessionInputTextarea
          disabled={disabled}
          onSubmit={submit}
          onValueChange={setDraft}
          placeholder={
            waitCopy ??
            t(
              "ui_helper_text",
              "session.input.placeholder",
              "Type your request or drag files with Shift held..."
            )
          }
          value={draft}
          waitCopy={draft.length === 0 ? waitCopy : null}
        />
        <TurnTimer runningSince={timing.runningSince} />
        <div className="session-input__action">
          {showStop ? (
            <button
              aria-label={t(
                "ui_labels",
                "session.input.stop",
                "Stop current turn"
              )}
              className="session-input__action-button session-input__action-button--stop"
              onClick={() => onStop?.()}
              title={t("ui_labels", "session.input.stop", "Stop current turn")}
              type="button"
            >
              <span
                aria-hidden="true"
                className="session-input__action-icon session-input__action-icon--stop"
              />
            </button>
          ) : (
            <button
              aria-label={t("ui_labels", "session.input.send", "Send message")}
              className="session-input__action-button"
              disabled={!canSubmit}
              type="submit"
            >
              <span
                aria-hidden="true"
                className="session-input__action-icon session-input__action-icon--play"
              >
                ▶
              </span>
            </button>
          )}
        </div>
      </div>
      <div className="session-input__footer">
        <span
          className="session-input__hint"
          style={disabled ? { visibility: "hidden" } : undefined}
        >
          {t(
            "ui_helper_text",
            "session.input.hint",
            "Press Enter to send, Shift+Enter for a new line"
          )}
        </span>
        <div className="session-input__footer-right">
          <SessionTotalTimer activeMs={timing.activeMs} />
        </div>
      </div>
    </form>
  );
}
export function ReferenceStatusPanel({
  onRollbackTurns,
  rollbackPending,
  session,
  settings,
  telemetry,
}: {
  onRollbackTurns?: (preserveFirstUserTurns: number) => void;
  rollbackPending?: boolean;
  session: CoreSession | undefined;
  settings: HarnessSettings | null;
  telemetry: SessionTelemetry;
}) {
  const { t } = useBrowserLocalization();
  const reasoning = resolveReasoningLabel(session, settings);
  const capabilities = telemetry.statusPanelCapabilities;
  const preserveFirstUserTurns = capabilities.rollbackPreserveFirstUserTurns;
  const showRollback = preserveFirstUserTurns !== null;
  const rollbackReady = Boolean(
    onRollbackTurns &&
      preserveFirstUserTurns !== null &&
      telemetry.turnCount > preserveFirstUserTurns &&
      telemetry.status === "idle"
  );
  return (
    <section className="session-status session-panel">
      <span className="session-status-chip session-status-chip--label">
        {t("ui_labels", "session.status.model", "Model:")}
      </span>
      <span className="session-status-button">{telemetry.model}</span>
      {reasoning ? (
        <span className="session-status-button session-status-button--compact">
          {reasoning}
        </span>
      ) : null}
      <span className="session-status-chip session-status-chip--limits">
        <span>{t("ui_labels", "session.status.tokens", "Tokens:")}</span>
        <strong title={telemetry.tokenDisplay.title}>
          {telemetry.tokenDisplay.value}
        </strong>
      </span>
      {capabilities.showCache && telemetry.cacheDisplay ? (
        <span className="session-status-chip session-status-chip--cache">
          <span>{t("ui_labels", "session.status.cache", "Cache:")}</span>
          <strong title={telemetry.cacheDisplay.title}>
            {telemetry.cacheDisplay.value}
          </strong>
        </span>
      ) : null}
      {capabilities.showTurns ? (
        <span className="session-status-chip session-status-chip--turns">
          <span>{t("ui_labels", "session.status.turns", "Turns:")}</span>
          <strong>{telemetry.turnCount}</strong>
        </span>
      ) : null}
      {showRollback ? (
        <button
          className="session-status-button session-status-button--rollback"
          disabled={!rollbackReady || rollbackPending}
          onClick={() => onRollbackTurns?.(preserveFirstUserTurns ?? 0)}
          type="button"
        >
          {t("ui_labels", "session.status.rollback", "Rollback")}
        </button>
      ) : null}
    </section>
  );
}
function LimitRow({ row }: { row: SessionTelemetry["limitRows"][number] }) {
  return (
    <div className="session-id-bar__limit-row" title={row.resetLabel ?? ""}>
      <span className="session-id-bar__limit-label">{row.text}</span>
      <span
        className="session-id-bar__limit-bar"
        style={
          row.percentUsed === null
            ? undefined
            : ({
                "--limit-fill": `${row.percentUsed}%`,
              } as CSSProperties)
        }
      />
    </div>
  );
}
// Applied session profile chip, driven strictly by the Core-owned applied
// profile snapshot; sessions persisted before profiles (no snapshot) show a
// legacy marker.
function SessionProfileChip({ session }: { session: CoreSession | undefined }) {
  if (!session) {
    return null;
  }
  const applied = session.appliedProfile;
  return (
    <span
      className={`session-profile-chip session-profile-chip--${applied?.kind ?? "legacy"}`}
      title={
        applied
          ? `Session profile: ${applied.profileName}`
          : "Created before session profiles"
      }
    >
      {applied?.profileName ?? "Legacy"}
    </span>
  );
}
function resolveIdLabel(
  session: CoreSession | undefined,
  telemetry: SessionTelemetry,
  t: ReturnType<typeof useBrowserLocalization>["t"]
): string {
  if (telemetry.providerSessionId) {
    return `ID: ${shortenId(telemetry.providerSessionId)}-...`;
  }
  return session
    ? t("messages_for_the_user", "session.id.pending", "ID: pending...")
    : t("messages_for_the_user", "session.id.unavailable", "ID: unavailable");
}
function resolveReasoningLabel(
  session: CoreSession | undefined,
  settings: HarnessSettings | null
): string | null {
  if (!(session && settings)) {
    return null;
  }
  if (isCodexProvider(session.providerId)) {
    // Core normalization already resolved the effort per catalog model.
    const effort = settings.providers.codex.reasoningByModel[session.model];
    return effort ? `(${effort})` : null;
  }
  if (session.providerId === "claude") {
    return settings.providers.claude.thinking.enabled
      ? `(${settings.providers.claude.thinkingByModel[session.model] ?? settings.providers.claude.thinking.effort})`
      : "(off)";
  }
  if (session.providerId === "grok") {
    const effort =
      session.reasoningEffort ??
      settings.providers.grok.reasoningByModel[session.model];
    return effort ? `(${effort})` : null;
  }
  if (session.providerId === "kimi-client") {
    const effort =
      session.reasoningEffort ??
      settings.providers.kimiClient.reasoningByModel[session.model];
    return effort ? `(${effort})` : null;
  }
  if (session.providerId === "openrouter-client") {
    return settings.providers.openRouter.endpointTag
      ? `(${settings.providers.openRouter.endpointTag})`
      : null;
  }
  return null;
}
const isCodexProvider = (providerId: string | undefined): boolean =>
  providerId === "codex";
function shortenId(id: string): string {
  return `${id.slice(0, 8)}...`;
}
export function SubagentSessionHeader({
  onOpenParent,
  parentSession,
  session,
}: {
  onOpenParent: (sessionId: string) => void | Promise<void>;
  parentSession: CoreSession | undefined;
  session: CoreSession;
}) {
  const { t } = useBrowserLocalization();
  const metadata = [
    session.agentNickname,
    session.agentRole,
    session.model,
    session.reasoningEffort,
  ].filter(Boolean);
  return (
    <section className="session-subagent-header session-panel">
      <div className="session-subagent-header__breadcrumb">
        {parentSession ? (
          <button
            onClick={() => onOpenParent(parentSession.id)}
            title={parentSession.title}
            type="button"
          >
            {parentSession.title}
          </button>
        ) : (
          <span>
            {t(
              "messages_for_the_user",
              "session.subagent.parentUnavailable",
              "Parent session unavailable"
            )}
          </span>
        )}
        <ChevronRight aria-hidden="true" size={14} />
        <strong>{session.title}</strong>
      </div>
      <div className="session-subagent-header__body">
        <div>
          <span className="session-subagent-header__eyebrow">
            {t("ui_labels", "session.subagent.task", "Delegated task")}
          </span>
          <p>{session.delegatedTask ?? session.title}</p>
        </div>
        <span
          className={`session-subagent-header__status session-subagent-header__status--${session.subagentStatus ?? "pending"}`}
        >
          {t(
            "ui_labels",
            `session.subagent.status.${session.subagentStatus ?? "pending"}`,
            session.subagentStatus ?? "pending"
          )}
        </span>
      </div>
      <div className="session-subagent-header__meta">
        <span>{metadata.join(" · ")}</span>
        <span>
          {t(
            "ui_helper_text",
            "session.subagent.readOnly",
            "Read-only live subagent session"
          )}
        </span>
      </div>
    </section>
  );
}
