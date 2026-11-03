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

export interface WorkflowAutopilotSnapshot {
  continues: number;
  enabled: boolean;
  lastDecision: AutopilotDecision | null;
  maxContinues: number;
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
  lastDecision: AutopilotDecision | null;
  /** Text of the continue turn the autopilot sent and has not seen yet. */
  pendingText: string | null;
  running: boolean;
  state: AutopilotState;
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

/**
 * Core executor of the Workflow Kit autopilot: after a turn of a primary
 * session ends, it reads the Kit status, asks the pure autopilot decision
 * and sends the next turn with a fresh recovery packet. State lives in
 * memory per session; the autopilot is off by default.
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
   * user message.
   */
  async setEnabled(
    sessionId: string,
    enabled: boolean
  ): Promise<WorkflowAutopilotSnapshot> {
    const entry = this.entry(sessionId);
    entry.state = this.decisions.initialState(
      entry.state.maxContinues,
      enabled
    );
    entry.lastDecision = null;
    this.publish(sessionId, entry);
    if (enabled && !entry.running) {
      await this.evaluate(sessionId, entry, "completed", UNKNOWN_BASELINE);
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
      ? this.baseline(session.workspacePath)
      : null;
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
    before: Baseline
  ): Promise<void> {
    const session = this.binding?.getSession(sessionId);
    if (!(this.binding && eligible(session))) {
      return;
    }
    const status = await this.status(session.workspacePath);
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

  private async baseline(root: string): Promise<Baseline | null> {
    const status = await this.status(root);
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
        lastDecision: null,
        pendingText: null,
        running: false,
        state: this.decisions.initialState(),
      };
      this.entries.set(sessionId, entry);
    }
    return entry;
  }

  private snapshot(
    sessionId: string,
    entry: SessionEntry
  ): WorkflowAutopilotSnapshot {
    return {
      continues: entry.state.continues,
      enabled: entry.state.enabled,
      lastDecision: entry.lastDecision,
      maxContinues: entry.state.maxContinues,
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
