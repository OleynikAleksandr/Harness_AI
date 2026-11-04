import type {
  KitFailure,
  KitOutcome,
  WorkflowHostFacade,
} from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import type {
  ScopeChoiceResult,
  ScopeProposalView,
} from "../../../../project-workflow/modules/workflow-kit/src/workflow-kit-facade.js";

/** Core event published on every change of a workspace's mode card. */
export const WORKFLOW_MODE_CHOICE_EVENT_TYPE = "workflow:mode-choice";
/** Only Claude sessions can hand tasks to executors on this stage. */
const EXECUTOR_PROVIDERS = new Set(["claude"]);

export type ModeChoiceOptionId = "orchestrated" | "refine" | "sequential";
export type ModeChoiceState = "chosen" | "dismissed" | "offered" | "saving";

/** One row of the card; the recommended row comes first. */
export interface ModeChoiceOption {
  id: ModeChoiceOptionId;
  recommended: boolean;
}

/**
 * Core truth of the execution mode card of one workspace (spec 4.2 of
 * `WorkflowKitExecutionModes.md`). The renderer only renders it.
 */
export interface ModeChoiceCard {
  /** The option the user chose; set in `chosen`. */
  chosen: ModeChoiceOptionId | null;
  /** The last refusal of a choice (the card stays `offered`). */
  error: string | null;
  generation: number;
  options: ModeChoiceOption[];
  /** Why the agent recommends its mode; `null` when that mode is not offered. */
  reason: string | null;
  scopeId: string;
  /** The owner session: the one whose turn ended with the proposal. */
  sessionId: string;
  state: ModeChoiceState;
  /** The scope objective. */
  title: string;
  workspaceId: string;
}

/** The fields of a Core session record the card needs. */
export interface ModeChoiceSession {
  id: string;
  providerId: string;
  sessionKind?: string;
  sessionPurpose?: unknown;
  workspaceId: string;
  workspacePath?: string;
}

export interface ModeChoiceDependencies {
  /**
   * The Core autopilot (`SessionWorkflowAutopilot`); it publishes
   * `workflow:autopilot` on every change.
   */
  autopilot: {
    setEnabled: (
      sessionId: string,
      enabled: boolean,
      options: { evaluate: boolean }
    ) => Promise<unknown>;
  };
  host: Pick<WorkflowHostFacade, "bundle" | "chooseScope" | "proposal">;
  /** Publishes a Core event to the project workflow listeners. */
  publish: (event: unknown) => void;
  sessions: {
    get: (sessionId: string) => ModeChoiceSession | undefined;
    /** The Core user-message route: publishes the message and starts the turn. */
    send: (sessionId: string, text: string) => { error?: string; ok: boolean };
    /** Core session events; the card reacts to `session:turn-state` idle. */
    subscribe: (listener: (event: unknown) => void) => () => void;
  };
}

/** Kit note of the choice: the user's action in words. */
const CHOICE_NOTES: Readonly<Record<ModeChoiceOptionId, string>> = {
  orchestrated:
    "the user chose in the Harness mode card: orchestrate executors",
  refine: "the user chose in the Harness mode card: refine the specification",
  sequential: "the user chose in the Harness mode card: execute sequentially",
};

/** The user message that tells the agent how to continue after the choice. */
const CHOICE_MESSAGES: Readonly<Record<ModeChoiceOptionId, string>> = {
  orchestrated:
    "Execution mode chosen: orchestrated. You are the orchestrator: do not implement the tasks yourself. Hand out the tasks with `scripts/workflow assignment:next` and `scripts/workflow assignment:create` to Claude subagents started with isolation worktree, check their results and integrate them.",
  refine:
    "I want to refine the specification first. Discuss it with me, then propose the scope again with `scripts/workflow scope:propose`.",
  sequential:
    "Execution mode chosen: sequential. Execute the plan yourself task by task, starting now with the first task: run `scripts/workflow task:start <ID>`, implement it and commit with `scripts/workflow commit --task <ID>`.",
};

function failure(message: string, code: string): KitFailure {
  return { code, message, nextAction: null, ok: false };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Primary user sessions with a workspace; not subagents or Profile Creator. */
function eligible(
  session: ModeChoiceSession | undefined
): session is ModeChoiceSession & { workspacePath: string } {
  return Boolean(
    session?.workspacePath &&
      session.sessionKind !== "subagent" &&
      !session.sessionPurpose
  );
}

/** A proposal the user can still answer in a Harness project. */
function openProposal(
  view: ScopeProposalView | null
): view is ScopeProposalView & { scopeId: string } {
  return Boolean(
    view && view.host === "harness" && !view.refining && view.scopeId
  );
}

/** Card rows: `orchestrated` only for providers with executors. */
function cardOptions(
  view: ScopeProposalView,
  providerId: string
): ModeChoiceOption[] {
  const executors = EXECUTOR_PROVIDERS.has(providerId);
  return view.options
    .filter((id) => id !== "orchestrated" || executors)
    .map((id) => ({ id, recommended: id === view.recommended }));
}

/**
 * Core route of the execution mode card: after a turn of a primary session
 * ends it reads `scope:proposal` and offers the card to that session; the
 * click becomes `scope:choose` plus a user message to the agent; a message
 * the user types while the card is offered dismisses it.
 */
export class CoreWorkflowModeChoice {
  private readonly cards = new Map<string, ModeChoiceCard>();
  private readonly reads = new Map<string, number>();
  private readonly dependencies: ModeChoiceDependencies;

  constructor(dependencies: ModeChoiceDependencies) {
    this.dependencies = dependencies;
    dependencies.sessions.subscribe((event) => {
      const value = record(event);
      const payload = record(value.payload);
      if (
        value.type === "session:turn-state" &&
        payload.state === "idle" &&
        typeof payload.sessionId === "string"
      ) {
        this.turnEnded(payload.sessionId).catch(() => undefined);
      }
    });
  }

  /** `workflow-mode-choice-get {workspaceId}`. */
  get(
    workspaceId: string
  ): KitFailure | { card: ModeChoiceCard | null; ok: true } {
    return workspaceId
      ? { card: this.cards.get(workspaceId) ?? null, ok: true }
      : failure("workspaceId is required.", "INVALID_REQUEST");
  }

  /** A message the user typed into a session dismisses its offered card. */
  userMessage(sessionId: string): void {
    for (const card of this.cards.values()) {
      if (card.sessionId === sessionId && card.state === "offered") {
        this.update(card, { error: null, state: "dismissed" });
      }
    }
  }

  /**
   * `workflow-mode-choose {workspaceId, sessionId, generation, option}`:
   * records the choice through `scope:choose`, turns on the autopilot of
   * the owner session for `sequential` and `orchestrated` (not `refine`)
   * and sends the owner session the user message of the choice. A Kit
   * refusal keeps the card offered and the autopilot unchanged.
   */
  async choose(
    payload: unknown
  ): Promise<
    KitFailure | { card: ModeChoiceCard; choice: ScopeChoiceResult; ok: true }
  > {
    const request = record(payload);
    const card = this.cards.get(String(request.workspaceId ?? ""));
    const option = request.option as ModeChoiceOptionId;
    const generation = request.generation;
    if (
      !card ||
      card.state !== "offered" ||
      card.sessionId !== request.sessionId
    ) {
      return failure(
        "No execution mode card is offered to this session.",
        "MODE_CHOICE_UNAVAILABLE"
      );
    }
    if (
      !(
        Number.isSafeInteger(generation) &&
        (generation as number) >= 1 &&
        card.options.some((item) => item.id === option)
      )
    ) {
      return failure(
        "generation and an offered option are required.",
        "INVALID_REQUEST"
      );
    }
    const session = this.dependencies.sessions.get(card.sessionId);
    if (!eligible(session)) {
      return failure("The owner session is gone.", "MODE_CHOICE_UNAVAILABLE");
    }
    const saving = this.update(card, { error: null, state: "saving" });
    const outcome: KitOutcome<ScopeChoiceResult> =
      await this.dependencies.host.chooseScope(session.workspacePath, {
        generation: generation as number,
        note: CHOICE_NOTES[option],
        option,
        session: card.sessionId,
      });
    if (!outcome.ok) {
      this.update(saving, { error: outcome.message, state: "offered" });
      return outcome;
    }
    const chosen = this.update(saving, { chosen: option, state: "chosen" });
    if (option !== "refine") {
      // Armed before the turn starts: the end of the agent's turn (one task,
      // one commit, one turn) continues the plan. No immediate evaluation:
      // the choice message is the next turn.
      await this.dependencies.autopilot.setEnabled(card.sessionId, true, {
        evaluate: false,
      });
    }
    const sent = this.dependencies.sessions.send(
      card.sessionId,
      CHOICE_MESSAGES[option]
    );
    if (!sent.ok) {
      this.update(chosen, { error: sent.error ?? "The message was not sent." });
    }
    return {
      card: this.cards.get(card.workspaceId) ?? chosen,
      choice: outcome.result,
      ok: true,
    };
  }

  private async turnEnded(sessionId: string): Promise<void> {
    const session = this.dependencies.sessions.get(sessionId);
    if (
      !eligible(session) ||
      this.dependencies.host.bundle(session.workspacePath)?.source !== "project"
    ) {
      return;
    }
    const workspaceId = session.workspaceId;
    const read = (this.reads.get(workspaceId) ?? 0) + 1;
    this.reads.set(workspaceId, read);
    const outcome = await this.dependencies.host.proposal(
      session.workspacePath
    );
    const current = this.cards.get(workspaceId);
    if (
      !outcome.ok ||
      this.reads.get(workspaceId) !== read ||
      current?.state === "saving"
    ) {
      return;
    }
    const view = outcome.result;
    if (!openProposal(view)) {
      // Chosen, refined, created or closed: the card leaves the chat.
      if (current) {
        this.cards.delete(workspaceId);
        this.publish(workspaceId, current.sessionId, null);
      }
      return;
    }
    if (current?.generation === view.generation) {
      return;
    }
    const options = cardOptions(view, session.providerId);
    const recommended = options.some((item) => item.recommended);
    const card: ModeChoiceCard = {
      chosen: null,
      error: null,
      generation: view.generation,
      options: [
        ...options.filter((item) => item.recommended),
        ...options.filter((item) => !item.recommended),
      ],
      reason: recommended ? view.reason : null,
      scopeId: view.scopeId,
      sessionId,
      state: "offered",
      title: view.objective ?? view.scopeId,
      workspaceId,
    };
    this.cards.set(workspaceId, card);
    this.publish(workspaceId, sessionId, card);
  }

  private update(
    card: ModeChoiceCard,
    patch: Partial<ModeChoiceCard>
  ): ModeChoiceCard {
    const next = { ...card, ...patch };
    this.cards.set(card.workspaceId, next);
    this.publish(card.workspaceId, card.sessionId, next);
    return next;
  }

  private publish(
    workspaceId: string,
    sessionId: string,
    card: ModeChoiceCard | null
  ): void {
    this.dependencies.publish({
      card,
      sessionId,
      type: WORKFLOW_MODE_CHOICE_EVENT_TYPE,
      workspaceId,
    });
  }
}
