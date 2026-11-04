import {
  type AutopilotDecision,
  type AutopilotProjectStatus,
  type AutopilotState,
  type WorkflowAutopilotFacade,
  workflowAutopilotFacade,
} from "../../../../project-workflow/modules/workflow-autopilot/src/workflow-autopilot-facade.js";
import {
  type WorkflowHostFacade,
  workflowHostFacade,
} from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import type { RecoveryPacket } from "../../../../project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.js";
import type { CoreSession } from "./session-request-handler-types.js";

/** Core event published on every autopilot change and decision. */
export const WORKFLOW_AUTOPILOT_EVENT_TYPE = "workflow:autopilot";
const KIT_TIMEOUT_MS = 30_000;
/** Kick-off and unknown baselines never match a real plan revision. */
const UNKNOWN_BASELINE = { head: null, revision: -1 } as const;

type AutopilotHost = Pick<WorkflowHostFacade, "bundle" | "run">;
interface Baseline {
  head: string | null;
  revision: number;
}

/**
 * The workflow pause as the plan panel shows it: `running` — no Kit pause;
 * `pausing` — paused while the turn runs or work is still active (the
 * focus task IN_PROGRESS, or an assignment or integration of an
 * orchestrated scope); `paused` — paused, idle and nothing active.
 */
export type WorkflowPauseState = "paused" | "pausing" | "running";

export interface WorkflowAutopilotSnapshot {
  /** The session can use the autopilot (a primary session with a workspace). */
  available: boolean;
  continues: number;
  /** On by default for an available session; always false otherwise. */
  enabled: boolean;
  lastDecision: AutopilotDecision | null;
  maxContinues: number;
  /** Derived from the last Kit status the session read. */
  pauseState: WorkflowPauseState;
  running: boolean;
  sessionId: string;
}

export interface WorkflowAutopilotBinding {
  getSession: (sessionId: string) => CoreSession | undefined;
  /** Publishes and dispatches the continue turn as a user message. */
  send: (sessionId: string, text: string) => void;
}

interface SessionEntry {
  before: Promise<Baseline | null> | null;
  cancelled: boolean;
  /** A user message arrived while a turn was running. */
  interjected: boolean;
  /** `paused` of the last Kit status read for the session. */
  kitPaused: boolean;
  lastDecision: AutopilotDecision | null;
  /** Text of the continue turn the autopilot sent and has not seen yet. */
  pendingText: string | null;
  running: boolean;
  state: AutopilotState;
  /**
   * The last Kit status read has active work: the focus task IN_PROGRESS,
   * or an orchestrated scope's assignment or integration journal.
   */
  workActive: boolean;
}

/** Primary user sessions with a workspace; not subagents or Profile Creator. */
function eligible(session: CoreSession | undefined): session is CoreSession & {
  workspacePath: string;
} {
  return Boolean(
    session?.workspacePath &&
      session.sessionKind !== "subagent" &&
      !session.sessionPurpose
  );
}

function pauseState(entry: SessionEntry): WorkflowPauseState {
  if (!entry.kitPaused) {
    return "running";
  }
  return entry.running || entry.workActive ? "pausing" : "paused";
}

/**
 * Core executor of the Workflow Kit autopilot: after a turn of a primary
 * session ends, it reads the Kit status, asks the pure autopilot decision
 * and sends the next turn with a fresh recovery packet. State lives in
 * memory per session; the autopilot is on by default and a Kit pause
 * (`pause:set --on`) stops it with `paused`.
 */
export class SessionWorkflowAutopilot {
  private binding: WorkflowAutopilotBinding | null = null;
  private readonly entries = new Map<string, SessionEntry>();
  private readonly listeners = new Set<(event: unknown) => void>();
  private readonly host: AutopilotHost;
  private readonly decisions: WorkflowAutopilotFacade;

  constructor(
    host: AutopilotHost = workflowHostFacade,
    decisions: WorkflowAutopilotFacade = workflowAutopilotFacade
  ) {
    this.host = host;
    this.decisions = decisions;
  }

  /** The session runtime that owns sessions and sends turns. */
  attach(binding: WorkflowAutopilotBinding): void {
    this.binding = binding;
  }

  subscribe(listener: (event: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get(sessionId: string): WorkflowAutopilotSnapshot {
    return this.snapshot(sessionId, this.entry(sessionId));
  }

  /**
   * Turns the autopilot on or off. Turning it on for an idle session
   * evaluates the project at once, so the first task starts without a
   * user message, unless `evaluate` is false: the caller dispatches the
   * next turn itself (the mode card choice message) and the end of that
   * turn decides. A session that cannot use it stays off.
   */
  async setEnabled(
    sessionId: string,
    enabled: boolean,
    options: { evaluate?: boolean } = {}
  ): Promise<WorkflowAutopilotSnapshot> {
    const entry = this.entry(sessionId);
    const allowed = enabled && eligible(this.binding?.getSession(sessionId));
    entry.state = this.decisions.initialState(
      entry.state.maxContinues,
      allowed
    );
    entry.lastDecision = null;
    this.publish(sessionId, entry);
    if (allowed && !entry.running && options.evaluate !== false) {
      await this.evaluate(sessionId, entry, "completed", UNKNOWN_BASELINE);
    }
    return this.snapshot(sessionId, entry);
  }

  /**
   * Re-reads the Kit status after `pause:set` and publishes the snapshot
   * with its `pauseState`. Without a pause, an idle enabled session
   * evaluates at once like the user's consent (the continue counter starts
   * from zero), so the plan goes on without a user message.
   */
  async refreshPause(sessionId: string): Promise<WorkflowAutopilotSnapshot> {
    const entry = this.entry(sessionId);
    const session = this.binding?.getSession(sessionId);
    if (!eligible(session)) {
      return this.snapshot(sessionId, entry);
    }
    const status = await this.status(session.workspacePath);
    this.remember(entry, status);
    this.publish(sessionId, entry);
    if (!(entry.kitPaused || entry.running) && entry.state.enabled) {
      entry.state = this.decisions.initialState(entry.state.maxContinues);
      await this.evaluate(
        sessionId,
        entry,
        "completed",
        UNKNOWN_BASELINE,
        status
      );
    }
    return this.snapshot(sessionId, entry);
  }

  /** Every message dispatched to a provider, by the user or the autopilot. */
  turnDispatched(session: CoreSession, text: string): void {
    if (!eligible(session)) {
      return;
    }
    const entry = this.entry(session.id);
    if (entry.pendingText !== null && entry.pendingText === text) {
      entry.pendingText = null;
      entry.interjected = false;
    } else {
      entry.interjected = entry.running;
    }
    entry.running = true;
    entry.cancelled = false;
    entry.before = entry.state.enabled
      ? this.baseline(session.workspacePath, entry)
      : null;
    if (entry.kitPaused) {
      this.publish(session.id, entry);
    }
  }

  /** The user stopped the turn: the chain ends with `turn-error`. */
  turnCancelled(sessionId: string): void {
    const entry = this.entries.get(sessionId);
    if (!entry?.running) {
      return;
    }
    entry.cancelled = true;
    this.finish(sessionId, entry, "cancelled");
  }

  /** The provider finished the turn (completed, failed or errored). */
  turnFinished(sessionId: string, outcome: "completed" | "error"): void {
    const entry = this.entries.get(sessionId);
    if (!entry?.running) {
      return;
    }
    this.finish(sessionId, entry, entry.cancelled ? "cancelled" : outcome);
  }

  private finish(
    sessionId: string,
    entry: SessionEntry,
    outcome: "cancelled" | "completed" | "error"
  ): void {
    entry.running = false;
    if (!entry.state.enabled) {
      if (entry.kitPaused) {
        this.publish(sessionId, entry);
      }
      return;
    }
    const before = entry.before ?? Promise.resolve(null);
    entry.before = null;
    before
      .then((baseline) =>
        this.evaluate(sessionId, entry, outcome, baseline ?? UNKNOWN_BASELINE)
      )
      .catch(() => undefined);
  }

  private async evaluate(
    sessionId: string,
    entry: SessionEntry,
    outcome: "cancelled" | "completed" | "error",
    before: Baseline,
    known?: AutopilotProjectStatus | { unavailable: string }
  ): Promise<void> {
    const session = this.binding?.getSession(sessionId);
    if (!(this.binding && eligible(session))) {
      return;
    }
    const status = known ?? (await this.status(session.workspacePath));
    this.remember(entry, status);
    if (entry.running || !entry.state.enabled) {
      return;
    }
    const decision: AutopilotDecision =
      "unavailable" in status
        ? { action: "stop", detail: status.unavailable, reason: "blocked" }
        : this.decisions.decide(entry.state, status, {
            before,
            outcome,
            userMessage: entry.interjected,
          });
    entry.state = this.decisions.advance(entry.state, decision);
    entry.lastDecision = decision;
    entry.interjected = false;
    this.publish(sessionId, entry);
    if (decision.action !== "continue") {
      return;
    }
    const packet = await this.packet(session.workspacePath);
    if (entry.running || !entry.state.enabled) {
      return;
    }
    const text = this.decisions.message(decision, packet);
    entry.pendingText = text;
    this.binding.send(sessionId, text);
  }

  private async status(
    root: string
  ): Promise<AutopilotProjectStatus | { unavailable: string }> {
    if (this.host.bundle(root)?.source !== "project") {
      return { unavailable: "The workspace has no Workflow Kit." };
    }
    const outcome = await this.host.run<AutopilotProjectStatus>(
      ["autopilot:status"],
      { root, timeoutMs: KIT_TIMEOUT_MS }
    );
    return outcome.ok
      ? outcome.result
      : { unavailable: `Workflow Kit status failed: ${outcome.message}` };
  }

  /** Keeps the pause facts of a Kit status; a failed read keeps the last. */
  private remember(
    entry: SessionEntry,
    status: AutopilotProjectStatus | { unavailable: string }
  ): void {
    if ("unavailable" in status) {
      return;
    }
    entry.kitPaused = status.paused === true;
    const orchestration = status.orchestration;
    entry.workActive =
      status.nextTask?.status === "IN_PROGRESS" ||
      Boolean(
        orchestration &&
          (orchestration.assignments.length > 0 || orchestration.integration)
      );
  }

  private async baseline(
    root: string,
    entry: SessionEntry
  ): Promise<Baseline | null> {
    const status = await this.status(root);
    this.remember(entry, status);
    return "unavailable" in status
      ? null
      : { head: status.head, revision: status.revision };
  }

  private async packet(root: string): Promise<string | null> {
    const outcome = await this.host.run<RecoveryPacket>(
      ["recover", "--event", "resume"],
      { root, timeoutMs: KIT_TIMEOUT_MS }
    );
    return outcome.ok && outcome.result.text.trim()
      ? outcome.result.text
      : null;
  }

  private entry(sessionId: string): SessionEntry {
    let entry = this.entries.get(sessionId);
    if (!entry) {
      entry = {
        before: null,
        cancelled: false,
        interjected: false,
        kitPaused: false,
        lastDecision: null,
        pendingText: null,
        running: false,
        state: this.decisions.initialState(),
        workActive: false,
      };
      this.entries.set(sessionId, entry);
    }
    return entry;
  }

  private snapshot(
    sessionId: string,
    entry: SessionEntry
  ): WorkflowAutopilotSnapshot {
    const available = eligible(this.binding?.getSession(sessionId));
    return {
      available,
      continues: entry.state.continues,
      enabled: available && entry.state.enabled,
      lastDecision: entry.lastDecision,
      maxContinues: entry.state.maxContinues,
      pauseState: pauseState(entry),
      running: entry.running,
      sessionId,
    };
  }

  private publish(sessionId: string, entry: SessionEntry): void {
    const event = {
      ...this.snapshot(sessionId, entry),
      type: WORKFLOW_AUTOPILOT_EVENT_TYPE,
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

/** The Core autopilot; the session runtime attaches to it at construction. */
export const sessionWorkflowAutopilot = new SessionWorkflowAutopilot();
