import { X } from "lucide-react";
import { useCallback, useState } from "react";
import type { SessionCoreEvent } from "../../../../../../core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.js";
import type {
  ProviderInteractionDecision,
  ProviderInteractionQuestion,
  ProviderInteractionRequestEvent,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";

export type PendingGrokInteraction = ProviderInteractionRequestEvent & {
  readonly sessionId: string;
};

export function applyGrokInteractionEvent(
  current: Readonly<Record<string, PendingGrokInteraction>>,
  event: SessionCoreEvent
): Record<string, PendingGrokInteraction> {
  if (event.type === "session:provider-interaction") {
    return { ...current, [event.payload.sessionId]: event.payload };
  }
  if (event.type !== "session:provider-interaction-resolved") {
    return current;
  }
  const pending = current[event.payload.sessionId];
  if (pending?.interactionId !== event.payload.interactionId) {
    return current;
  }
  const next = { ...current };
  delete next[event.payload.sessionId];
  return next;
}

export function useGrokInteractionState() {
  const [pendingBySession, setPendingBySession] = useState<
    Record<string, PendingGrokInteraction>
  >({});
  const applyEvent = useCallback((event: SessionCoreEvent) => {
    setPendingBySession((current) => applyGrokInteractionEvent(current, event));
  }, []);
  const respond = useCallback(
    async (
      interaction: PendingGrokInteraction,
      decision: ProviderInteractionDecision
    ): Promise<string | null> => {
      const result = await window.harnessCore?.respondProviderInteraction({
        decision,
        sessionId: interaction.sessionId,
      });
      if (!result) {
        return "Core runtime bridge is unavailable.";
      }
      return result.ok ? null : result.error;
    },
    []
  );
  return { applyEvent, pendingBySession, respond };
}

export function ActiveGrokInteractionPanel({
  sessionId,
  state,
}: {
  sessionId?: string;
  state: ReturnType<typeof useGrokInteractionState>;
}) {
  const interaction = sessionId ? state.pendingBySession[sessionId] : undefined;
  return interaction ? (
    <GrokInteractionPanel
      interaction={interaction}
      onRespond={(decision) => state.respond(interaction, decision)}
    />
  ) : null;
}

export function GrokInteractionPanel({
  interaction,
  onRespond,
}: {
  interaction: PendingGrokInteraction;
  onRespond: (decision: ProviderInteractionDecision) => Promise<string | null>;
}) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [freeform, setFreeform] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function respond(decision: ProviderInteractionDecision) {
    setSubmitting(true);
    setError(null);
    try {
      const responseError = await onRespond(decision);
      if (responseError) {
        setError(responseError);
        setSubmitting(false);
      }
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : String(responseError)
      );
      setSubmitting(false);
    }
  }

  async function answerQuestions() {
    const resolvedAnswers = Object.fromEntries(
      interaction.questions.map((question) => [
        question.id,
        freeform[question.id]?.trim() || answers[question.id] || "",
      ])
    );
    if (Object.values(resolvedAnswers).some((answer) => answer.length === 0)) {
      setError("Answer every question before continuing.");
      return;
    }
    await respond({
      answers: resolvedAnswers,
      interactionId: interaction.interactionId,
      outcome: "answered",
    });
  }

  const cancel = () =>
    respond({
      ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      interactionId: interaction.interactionId,
      outcome: "cancelled",
    });
  const submitLabel = resolveSubmitLabel(interaction.kind, submitting);

  return (
    <div className="provider-picker-backdrop">
      <section
        aria-labelledby="grok-interaction-title"
        aria-modal="true"
        className="provider-picker-card"
        role="dialog"
      >
        <header className="provider-picker-header">
          <div>
            <p className="session-kicker">Grok · action required</p>
            <h2 id="grok-interaction-title">{interaction.title}</h2>
          </div>
          <button
            className="icon-button"
            disabled={submitting}
            onClick={() => cancel().catch(() => undefined)}
            title="Cancel"
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </header>

        <div className="session-profile-step-body">
          <p className="session-profile-step-description">
            {interaction.message}
          </p>
          {interaction.kind === "permission" ? (
            <PermissionOptions
              disabled={submitting}
              interaction={interaction}
              onSelect={(optionId) =>
                respond({
                  interactionId: interaction.interactionId,
                  optionId,
                  outcome: "selected",
                })
              }
            />
          ) : null}
          {interaction.kind === "ask_user"
            ? interaction.questions.map((question) => (
                <QuestionField
                  answers={answers[question.id] ?? []}
                  disabled={submitting}
                  freeform={freeform[question.id] ?? ""}
                  key={question.id}
                  onAnswers={(value) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }
                  onFreeform={(value) =>
                    setFreeform((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }
                  question={question}
                />
              ))
            : null}
          {interaction.kind === "plan_approval" ? (
            <>
              <pre className="session-profile-step-description">
                {interaction.plan ?? "No plan content was provided."}
              </pre>
              <label className="session-profile-step-label">
                Feedback (optional)
                <textarea
                  className="session-profile-step-select"
                  disabled={submitting}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={3}
                  value={feedback}
                />
              </label>
            </>
          ) : null}
          {error ? <p className="session-profile-step-error">{error}</p> : null}
        </div>

        {interaction.kind === "permission" ? null : (
          <footer className="session-profile-step-footer">
            <button
              className="session-profile-step-back"
              disabled={submitting}
              onClick={() => cancel().catch(() => undefined)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="session-profile-step-start"
              disabled={submitting}
              onClick={() => {
                const action =
                  interaction.kind === "ask_user"
                    ? answerQuestions()
                    : respond({
                        interactionId: interaction.interactionId,
                        outcome: "approved",
                      });
                action.catch(() => setSubmitting(false));
              }}
              type="button"
            >
              {submitLabel}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

function PermissionOptions({
  disabled,
  interaction,
  onSelect,
}: {
  disabled: boolean;
  interaction: PendingGrokInteraction;
  onSelect: (optionId: string) => Promise<void>;
}) {
  return (
    <div className="provider-grid">
      {interaction.options.map((option) => (
        <button
          className="provider-card"
          disabled={disabled}
          key={option.id}
          onClick={() => onSelect(option.id).catch(() => undefined)}
          type="button"
        >
          <strong>{option.label}</strong>
          {option.description ? <span>{option.description}</span> : null}
        </button>
      ))}
    </div>
  );
}

function QuestionField({
  answers,
  disabled,
  freeform,
  onAnswers,
  onFreeform,
  question,
}: {
  answers: readonly string[];
  disabled: boolean;
  freeform: string;
  onAnswers: (value: string[]) => void;
  onFreeform: (value: string) => void;
  question: ProviderInteractionQuestion;
}) {
  return (
    <div className="session-profile-step-label">
      <span>
        {question.header ? `${question.header} · ` : ""}
        {question.prompt}
      </span>
      {question.options.length ? (
        <select
          aria-label={question.prompt}
          className="session-profile-step-select"
          disabled={disabled}
          multiple={question.allowMultiple}
          onChange={(event) =>
            onAnswers(
              [...event.currentTarget.selectedOptions].map(
                (option) => option.value
              )
            )
          }
          value={question.allowMultiple ? answers : (answers[0] ?? "")}
        >
          {question.allowMultiple ? null : <option value="">Choose...</option>}
          {question.options.map((option) => (
            <option key={option.id} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {question.allowFreeform ? (
        <textarea
          aria-label={`${question.prompt} free-form answer`}
          className="session-profile-step-select"
          disabled={disabled}
          onChange={(event) => onFreeform(event.target.value)}
          placeholder="Type an answer"
          rows={2}
          value={freeform}
        />
      ) : null}
    </div>
  );
}

function resolveSubmitLabel(
  kind: PendingGrokInteraction["kind"],
  submitting: boolean
): string {
  if (submitting) {
    return "Submitting...";
  }
  return kind === "ask_user" ? "Answer" : "Approve plan";
}
