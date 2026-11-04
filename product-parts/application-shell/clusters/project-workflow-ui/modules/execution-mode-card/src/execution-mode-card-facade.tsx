import { useState } from "react";
import { useBrowserLocalization } from "../../../../browser-localization/modules/browser-localization-provider/src/browser-localization-provider-facade.js";
import {
  BRIDGE_UNAVAILABLE,
  type useExecutionModeCard,
} from "./execution-mode-card-state.js";
import "../../../src/project-workflow-ui.css";
import "./execution-mode-card.css";

export { useExecutionModeCard } from "./execution-mode-card-state.js";

/** The Core card of a workspace and its click route (`useExecutionModeCard`). */
export type ExecutionModeChoice = ReturnType<typeof useExecutionModeCard>;

interface ExecutionModeCardProps {
  /** The Core card; the sidebar renders it only under its owner session. */
  card: WorkflowModeChoiceCard;
  /** Forwards the clicked option to Core; resolves to a refusal or null. */
  onChoose: ExecutionModeChoice["choose"];
}

type Translate = ReturnType<typeof useBrowserLocalization>["t"];

const OPTION_LABELS: Readonly<Record<WorkflowModeChoiceOptionId, string>> = {
  orchestrated: "Orchestrate executors",
  refine: "Refine the specification",
  sequential: "Execute sequentially",
};

const OPTION_DESCRIPTIONS: Readonly<
  Record<WorkflowModeChoiceOptionId, string>
> = {
  orchestrated:
    "This session becomes the orchestrator: each task goes to an executor in its own worktree, and the results are checked and integrated here.",
  refine: "Continue the discussion with the agent before the plan is created.",
  sequential: "One agent completes the tasks one by one in this session.",
};

function optionLabel(t: Translate, id: WorkflowModeChoiceOptionId): string {
  return t("ui_labels", `workflow.modeCard.option.${id}`, OPTION_LABELS[id]);
}

/** The compact line of a saved choice. */
function ChosenLine({
  card,
  t,
}: {
  card: WorkflowModeChoiceCard;
  t: Translate;
}) {
  return (
    <section
      aria-label={t("ui_labels", "workflow.modeCard.label", "Execution mode")}
      className="execution-mode-card execution-mode-card--chosen"
    >
      <span>
        {t("ui_labels", "workflow.modeCard.chosen", "Chosen")}:{" "}
        <strong>{card.chosen ? optionLabel(t, card.chosen) : ""}</strong>
        {" · "}
        {t("ui_labels", "workflow.modeCard.sent", "sent to the agent")}
      </span>
      {card.error ? (
        <small className="execution-mode-card-error" role="alert">
          {card.error}
        </small>
      ) : null}
    </section>
  );
}

/**
 * The execution mode card of a scope proposal (spec 4.2 of
 * `WorkflowKitExecutionModes.md`) in the left sidebar under the card of its
 * owner session, in the slot of the plan. Core owns the card; the click
 * goes to Core, which records the choice and sends it to the agent.
 */
export function ExecutionModeCardFacade({
  card,
  onChoose,
}: ExecutionModeCardProps) {
  const { t } = useBrowserLocalization();
  const [error, setError] = useState<string | null>(null);
  if (card.state === "dismissed") {
    return null;
  }
  if (card.state === "chosen") {
    return <ChosenLine card={card} t={t} />;
  }
  const saving = card.state === "saving";
  const shownError = card.error ?? error;
  const pick = (option: WorkflowModeChoiceOptionId) => {
    setError(null);
    onChoose(option)
      .then((message) =>
        setError(
          message === BRIDGE_UNAVAILABLE
            ? t(
                "messages_for_the_user",
                "core.bridge.unavailable",
                "Core runtime bridge is unavailable."
              )
            : message
        )
      )
      .catch((reason: unknown) => setError(String(reason)));
  };

  return (
    <section
      aria-busy={saving}
      aria-label={t("ui_labels", "workflow.modeCard.label", "Execution mode")}
      className={
        saving ? "execution-mode-card is-saving" : "execution-mode-card"
      }
    >
      <header className="execution-mode-card-header">
        <strong>
          {t(
            "ui_labels",
            "workflow.modeCard.question",
            "How should the plan be executed?"
          )}
        </strong>
        <small title={card.scopeId}>{card.title}</small>
      </header>
      <ul className="execution-mode-card-options">
        {card.options.map((option) => (
          <li className="execution-mode-card-option" key={option.id}>
            <div className="execution-mode-card-text">
              <span>
                {optionLabel(t, option.id)}
                {option.recommended ? (
                  <em>
                    {" "}
                    {t(
                      "ui_labels",
                      "workflow.modeCard.recommended",
                      "(recommended)"
                    )}
                  </em>
                ) : null}
              </span>
              <small>
                {t(
                  "ui_helper_text",
                  `workflow.modeCard.option.${option.id}.description`,
                  OPTION_DESCRIPTIONS[option.id]
                )}
              </small>
              {option.recommended && card.reason ? (
                <small className="execution-mode-card-reason">
                  {card.reason}
                </small>
              ) : null}
            </div>
            <button
              className={
                option.recommended
                  ? "project-workflow-primary"
                  : "project-workflow-secondary"
              }
              disabled={saving}
              onClick={() => pick(option.id)}
              type="button"
            >
              {t("ui_labels", "workflow.modeCard.choose", "Choose")}
            </button>
          </li>
        ))}
      </ul>
      <small className="execution-mode-card-hint">
        {saving
          ? t(
              "messages_for_the_user",
              "workflow.modeCard.saving",
              "Saving the choice..."
            )
          : t(
              "ui_helper_text",
              "workflow.modeCard.hint",
              "or write your answer in the chat"
            )}
      </small>
      {shownError ? (
        <small className="execution-mode-card-error" role="alert">
          {shownError}
        </small>
      ) : null}
    </section>
  );
}
