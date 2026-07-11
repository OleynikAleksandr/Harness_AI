import type {
  ProviderSubagentControlEvent,
  ProviderSubagentEvent,
  ProviderSubagentSessionEvent,
  ProviderSubagentState,
  ProviderSubagentStatus,
  ProviderSubagentStatusEvent,
} from "../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js";
import type {
  CoreSubagentCall,
  CoreSubagentCallStatus,
} from "../../session-event-stream/src/session-event-stream-facade.js";
import { buildProviderTurnOptions } from "./provider-turn-options.js";
import { createId } from "./session-request-handler-runtime-utils.js";
import type {
  CoreSession,
  CoreSubagentStatus,
} from "./session-request-handler-types.js";

interface ChildSessionSeed {
  readonly agentNickname?: string;
  readonly agentRole?: string;
  readonly model?: string;
  readonly providerSessionId: string;
  readonly reasoningEffort?: string;
  readonly status: CoreSubagentStatus;
  readonly subagentCallId?: string;
  readonly task?: string;
  readonly timestamp: string;
  readonly title?: string;
}

interface SessionSubagentLifecycleDependencies {
  readonly addSession: (session: CoreSession) => void;
  readonly adoptProviderSession: (
    childSession: CoreSession,
    parentSession: CoreSession
  ) => void;
  readonly getSession: (sessionId: string) => CoreSession | undefined;
  readonly getSubagentCall: (
    parentSessionId: string,
    callId: string
  ) => CoreSubagentCall | undefined;
  readonly listSessions: () => CoreSession[];
  readonly publishSubagentCall: (call: CoreSubagentCall) => void;
  readonly updateSession: (session: CoreSession) => void;
}

export class SessionSubagentLifecycle {
  private readonly deps: SessionSubagentLifecycleDependencies;

  constructor(deps: SessionSubagentLifecycleDependencies) {
    this.deps = deps;
  }

  handleProviderEvent(parentSessionId: string, event: ProviderSubagentEvent) {
    if (event.type === "subagent_control") {
      this.handleControlEvent(parentSessionId, event);
      return;
    }
    if (event.type === "subagent_session") {
      this.handleSessionEvent(parentSessionId, event);
      return;
    }
    this.handleStatusEvent(parentSessionId, event);
  }

  private handleControlEvent(
    parentSessionId: string,
    event: ProviderSubagentControlEvent
  ): void {
    const parent = this.deps.getSession(parentSessionId);
    if (!parent) {
      return;
    }
    const stateByProviderSessionId = new Map(
      event.agentStates.map((state) => [state.providerSessionId, state])
    );
    const providerSessionIds = uniqueStrings([
      ...event.receiverProviderSessionIds,
      ...stateByProviderSessionId.keys(),
    ]);
    const children = providerSessionIds.map((providerSessionId) =>
      this.ensureChildSession(parent, {
        model: event.model,
        providerSessionId,
        reasoningEffort: event.reasoningEffort,
        status:
          stateByProviderSessionId.get(providerSessionId)?.status ?? "running",
        subagentCallId: event.action === "spawn" ? event.callId : undefined,
        task: event.prompt,
        timestamp: event.timestamp,
      })
    );
    this.applyAgentStates(event.agentStates, event.timestamp);
    if (event.action !== "spawn") {
      return;
    }
    const previous = this.deps.getSubagentCall(parentSessionId, event.callId);
    const childSessionIds = uniqueStrings([
      ...(previous?.childSessionIds ?? []),
      ...children.map((child) => child.id),
    ]);
    this.deps.publishSubagentCall({
      childSessionIds,
      createdAt: previous?.createdAt ?? event.timestamp,
      id: event.callId,
      ...(event.model ? { model: event.model } : {}),
      ...(event.reasoningEffort
        ? { reasoningEffort: event.reasoningEffort }
        : {}),
      sessionId: parentSessionId,
      status: resolveCallStatus(
        event.lifecycleStatus,
        childSessionIds
          .map((sessionId) => this.deps.getSession(sessionId)?.subagentStatus)
          .filter((status): status is CoreSubagentStatus => Boolean(status))
      ),
      ...(event.prompt ? { task: event.prompt } : {}),
      updatedAt: event.timestamp,
    });
  }

  private handleSessionEvent(
    parentSessionId: string,
    event: ProviderSubagentSessionEvent
  ): void {
    const parent = this.deps.getSession(parentSessionId);
    if (
      !parent ||
      (parent.providerSessionId &&
        parent.providerSessionId !== event.parentProviderSessionId)
    ) {
      return;
    }
    const child = this.ensureChildSession(parent, {
      agentNickname: event.agentNickname,
      agentRole: event.agentRole,
      providerSessionId: event.providerSessionId,
      status: event.status,
      task: event.task,
      timestamp: event.timestamp,
      title: event.title,
    });
    this.updateParentCall(child, event.timestamp);
  }

  private handleStatusEvent(
    sessionId: string,
    event: ProviderSubagentStatusEvent
  ): void {
    const session = this.deps.getSession(sessionId);
    if (
      session?.sessionKind !== "subagent" ||
      session.providerSessionId !== event.providerSessionId
    ) {
      return;
    }
    const updated = {
      ...session,
      subagentStatus: event.status,
      updatedAt: event.timestamp,
    };
    this.deps.updateSession(updated);
    this.updateParentCall(updated, event.timestamp);
  }

  private applyAgentStates(
    states: readonly ProviderSubagentState[],
    timestamp: string
  ): void {
    for (const state of states) {
      const child = this.findChildByProviderSessionId(state.providerSessionId);
      if (!child) {
        continue;
      }
      const updated = {
        ...child,
        subagentStatus: state.status,
        updatedAt: timestamp,
      };
      this.deps.updateSession(updated);
      this.updateParentCall(updated, timestamp);
    }
  }

  private ensureChildSession(
    parent: CoreSession,
    seed: ChildSessionSeed
  ): CoreSession {
    const inheritedSeed = {
      ...seed,
      reasoningEffort:
        seed.reasoningEffort ??
        parent.reasoningEffort ??
        resolveConfiguredReasoningEffort(parent),
    };
    const existing = this.findChildByProviderSessionId(seed.providerSessionId);
    if (existing) {
      const updated = mergeChildSession(existing, inheritedSeed);
      this.deps.updateSession(updated);
      this.deps.adoptProviderSession(updated, parent);
      return updated;
    }
    const child: CoreSession = {
      ...(inheritedSeed.agentNickname
        ? { agentNickname: inheritedSeed.agentNickname }
        : {}),
      ...(inheritedSeed.agentRole
        ? { agentRole: inheritedSeed.agentRole }
        : {}),
      appliedProfile: parent.appliedProfile,
      createdAt: inheritedSeed.timestamp,
      ...(inheritedSeed.task ? { delegatedTask: inheritedSeed.task } : {}),
      id: createId("session-subagent"),
      model: inheritedSeed.model ?? parent.model,
      nextSessionMode: parent.nextSessionMode,
      parentSessionId: parent.id,
      providerId: parent.providerId,
      providerName: parent.providerName,
      providerSessionId: inheritedSeed.providerSessionId,
      ...(inheritedSeed.reasoningEffort
        ? { reasoningEffort: inheritedSeed.reasoningEffort }
        : {}),
      sessionKind: "subagent",
      ...(inheritedSeed.subagentCallId
        ? { subagentCallId: inheritedSeed.subagentCallId }
        : {}),
      subagentStatus: inheritedSeed.status,
      title: resolveChildTitle(inheritedSeed),
      titleOrigin: "auto",
      updatedAt: inheritedSeed.timestamp,
      workspaceId: parent.workspaceId,
      ...(parent.workspacePath ? { workspacePath: parent.workspacePath } : {}),
    };
    this.deps.addSession(child);
    this.deps.adoptProviderSession(child, parent);
    return child;
  }

  private findChildByProviderSessionId(
    providerSessionId: string
  ): CoreSession | undefined {
    return this.deps
      .listSessions()
      .find(
        (session) =>
          session.sessionKind === "subagent" &&
          session.providerSessionId === providerSessionId
      );
  }

  private updateParentCall(child: CoreSession, timestamp: string): void {
    if (!(child.parentSessionId && child.subagentCallId)) {
      return;
    }
    const call = this.deps.getSubagentCall(
      child.parentSessionId,
      child.subagentCallId
    );
    if (!call) {
      return;
    }
    const statuses = call.childSessionIds
      .map((sessionId) => this.deps.getSession(sessionId)?.subagentStatus)
      .filter((status): status is CoreSubagentStatus => Boolean(status));
    this.deps.publishSubagentCall({
      ...call,
      status: resolveCallStatus("completed", statuses),
      updatedAt: timestamp,
    });
  }
}

function mergeChildSession(
  session: CoreSession,
  seed: ChildSessionSeed
): CoreSession {
  const canAutoTitle = session.titleOrigin !== "manual";
  return {
    ...session,
    ...(seed.agentNickname ? { agentNickname: seed.agentNickname } : {}),
    ...(seed.agentRole ? { agentRole: seed.agentRole } : {}),
    ...(seed.task ? { delegatedTask: seed.task } : {}),
    ...(seed.model ? { model: seed.model } : {}),
    ...(seed.reasoningEffort ? { reasoningEffort: seed.reasoningEffort } : {}),
    ...(seed.subagentCallId ? { subagentCallId: seed.subagentCallId } : {}),
    subagentStatus: seed.status,
    ...(canAutoTitle ? { title: resolveChildTitle(seed, session.title) } : {}),
    updatedAt: seed.timestamp,
  };
}

function resolveChildTitle(seed: ChildSessionSeed, fallback = "Subagent") {
  const candidate = seed.title ?? seed.task ?? seed.agentRole ?? fallback;
  const normalized = candidate.replace(/\s+/gu, " ").trim();
  return normalized.length > 72
    ? `${normalized.slice(0, 69).trimEnd()}…`
    : normalized;
}

function resolveCallStatus(
  lifecycleStatus: ProviderSubagentControlEvent["lifecycleStatus"],
  statuses: readonly ProviderSubagentStatus[]
): CoreSubagentCallStatus {
  if (
    lifecycleStatus === "failed" ||
    statuses.some(
      (status) =>
        status === "failed" ||
        status === "interrupted" ||
        status === "not_found"
    )
  ) {
    return "failed";
  }
  if (statuses.some((status) => status === "pending" || status === "running")) {
    return "running";
  }
  return statuses.length > 0 ? "completed" : "running";
}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set(values)];
}

function resolveConfiguredReasoningEffort(
  session: CoreSession
): string | undefined {
  const effort = buildProviderTurnOptions(session).reasoningEffort;
  return typeof effort === "string" && effort.trim().length > 0
    ? effort.trim()
    : undefined;
}
