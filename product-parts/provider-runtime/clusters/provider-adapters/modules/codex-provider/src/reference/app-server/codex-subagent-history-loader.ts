interface CodexSubagentHistoryLoaderDependencies {
  readonly request: (method: string, params: unknown) => Promise<unknown>;
  readonly routeNotification: (method: string, params: unknown) => void;
}

interface ReplayOptions {
  readonly includeTranscript: boolean;
  readonly inheritedTurnIds: ReadonlySet<string>;
  readonly replayTerminalStatus: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const isTranscriptItem = (item: Record<string, unknown>): boolean =>
  ["agentMessage", "reasoning"].includes(asString(item.type) ?? "");

const readThreadSpawn = (
  thread: Record<string, unknown>
): Record<string, unknown> | null => {
  const source = isRecord(thread.source) ? thread.source : null;
  const subAgentValue = source?.subAgent ?? source?.subagent;
  const subAgent = isRecord(subAgentValue) ? subAgentValue : null;
  return isRecord(subAgent?.thread_spawn) ? subAgent.thread_spawn : null;
};

const readParentThreadId = (thread: Record<string, unknown>): string | null => {
  const direct = asString(thread.parentThreadId);
  if (direct) {
    return direct;
  }
  return asString(readThreadSpawn(thread)?.parent_thread_id);
};

const readThreadDepth = (thread: Record<string, unknown>): number => {
  return asNumber(readThreadSpawn(thread)?.depth) ?? Number.MAX_SAFE_INTEGER;
};

const readAgentPath = (thread: Record<string, unknown>): string | null =>
  asString(thread.agentPath) ??
  asString(readThreadSpawn(thread)?.agent_path) ??
  (readParentThreadId(thread) === null ? "/root" : null);

const isDirectChildPath = (parentPath: string, childPath: string): boolean => {
  const parentSegments = parentPath.split("/").filter(Boolean);
  const childSegments = childPath.split("/").filter(Boolean);
  return (
    childSegments.length === parentSegments.length + 1 &&
    parentSegments.every((segment, index) => childSegments[index] === segment)
  );
};

const isOwnedSubagentActivity = (
  thread: Record<string, unknown>,
  item: Record<string, unknown>
): boolean => {
  const itemType = asString(item.type);
  if (itemType === "collabAgentToolCall") {
    const senderThreadId = asString(item.senderThreadId);
    return senderThreadId
      ? senderThreadId === asString(thread.id)
      : readParentThreadId(thread) === null;
  }
  if (itemType !== "subAgentActivity") {
    return false;
  }
  const agentPath = readAgentPath(thread);
  const targetPath = asString(item.agentPath);
  return Boolean(
    agentPath && targetPath && isDirectChildPath(agentPath, targetPath)
  );
};

const readTurns = (
  thread: Record<string, unknown>
): Record<string, unknown>[] =>
  Array.isArray(thread.turns) ? thread.turns.filter(isRecord) : [];

const readItems = (turn: Record<string, unknown>): Record<string, unknown>[] =>
  Array.isArray(turn.items) ? turn.items.filter(isRecord) : [];

const readTurnId = (
  threadId: string,
  turn: Record<string, unknown>,
  turnIndex: number
): string => asString(turn.id) ?? `${threadId}:turn:${turnIndex}`;

const compareThreads = (
  left: Record<string, unknown>,
  right: Record<string, unknown>
): number => {
  const depthDifference = readThreadDepth(left) - readThreadDepth(right);
  if (depthDifference !== 0) {
    return depthDifference;
  }
  return (asNumber(left.createdAt) ?? 0) - (asNumber(right.createdAt) ?? 0);
};

const itemTimestampMs = (
  turn: Record<string, unknown>,
  itemIndex: number
): number => {
  const seconds =
    asNumber(turn.startedAt) ?? asNumber(turn.completedAt) ?? Date.now() / 1000;
  return seconds * 1000 + itemIndex;
};

export class CodexSubagentHistoryLoader {
  private readonly completedRoots = new Set<string>();
  private readonly deps: CodexSubagentHistoryLoaderDependencies;
  private hydrationChain: Promise<void> = Promise.resolve();
  private readonly hydrationByRoot = new Map<string, Promise<void>>();
  private readonly replayedActivities = new Set<string>();
  private readonly replayedTerminalStatuses = new Set<string>();
  private readonly replayedTranscripts = new Set<string>();
  private readonly threadReads = new Map<
    string,
    Promise<Record<string, unknown>>
  >();

  constructor(deps: CodexSubagentHistoryLoaderDependencies) {
    this.deps = deps;
  }

  hydrate(rootThreadId: string): Promise<void> {
    if (this.completedRoots.has(rootThreadId)) {
      return Promise.resolve();
    }
    const active = this.hydrationByRoot.get(rootThreadId);
    if (active) {
      return active;
    }
    // Hydrations of different roots share the replay sets and can touch the
    // same descendants; one serial chain keeps their notification order
    // deterministic instead of racing terminal statuses.
    const hydration = this.hydrationChain
      .then(() => this.hydrateRootOnce(rootThreadId))
      .finally(() => {
        this.hydrationByRoot.delete(rootThreadId);
      });
    this.hydrationByRoot.set(rootThreadId, hydration);
    this.hydrationChain = hydration.catch(() => undefined);
    return hydration;
  }

  private async hydrateRootOnce(rootThreadId: string): Promise<void> {
    if (this.completedRoots.has(rootThreadId)) {
      return;
    }
    await this.hydrateRoot(rootThreadId);
    this.completedRoots.add(rootThreadId);
  }

  private async hydrateRoot(rootThreadId: string): Promise<void> {
    const [rootThread, descendants] = await Promise.all([
      this.readThread(rootThreadId),
      this.listDescendants(rootThreadId),
    ]);
    const ancestors = await this.readAncestors(rootThread);
    const descendantThreads: Record<string, unknown>[] = [];
    for (const descendant of descendants.sort(compareThreads)) {
      const descendantId = asString(descendant.id);
      if (descendantId) {
        descendantThreads.push(await this.readThread(descendantId));
      }
    }
    const threadsById = new Map<string, Record<string, unknown>>();
    for (const thread of [...ancestors, rootThread, ...descendantThreads]) {
      const threadId = asString(thread.id);
      if (threadId) {
        threadsById.set(threadId, thread);
      }
    }
    const rootIsSubagent = readParentThreadId(rootThread) !== null;
    await this.replayThread(rootThread, {
      inheritedTurnIds: collectAncestorTurnIds(rootThread, threadsById),
      includeTranscript: rootIsSubagent,
      replayTerminalStatus: rootIsSubagent,
    });
    for (const descendant of descendantThreads) {
      const descendantId = asString(descendant.id);
      // A descendant whose terminal status was already replayed must not be
      // re-announced: a late thread/started would downgrade the terminal
      // status an earlier hydration just restored. Announce and replay as an
      // immediate pair so no started arrives without its final status.
      if (descendantId && this.replayedTerminalStatuses.has(descendantId)) {
        continue;
      }
      this.deps.routeNotification("thread/started", { thread: descendant });
      await this.replayThread(descendant, {
        inheritedTurnIds: collectAncestorTurnIds(descendant, threadsById),
        includeTranscript: true,
        replayTerminalStatus: true,
      });
    }
  }

  private async readAncestors(
    thread: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    const ancestors: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let parentThreadId = readParentThreadId(thread);
    while (parentThreadId && !seen.has(parentThreadId)) {
      seen.add(parentThreadId);
      const parent = await this.readThread(parentThreadId);
      ancestors.push(parent);
      parentThreadId = readParentThreadId(parent);
    }
    return ancestors;
  }

  private async listDescendants(
    rootThreadId: string
  ): Promise<Record<string, unknown>[]> {
    const descendants: Record<string, unknown>[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const response = await this.deps.request("thread/list", {
        ancestorThreadId: rootThreadId,
        ...(cursor ? { cursor } : {}),
        limit: 100,
        sortDirection: "asc",
      });
      if (!isRecord(response)) {
        return descendants;
      }
      if (Array.isArray(response.data)) {
        descendants.push(...response.data.filter(isRecord));
      }
      cursor = asString(response.nextCursor);
      if (cursor && seenCursors.has(cursor)) {
        break;
      }
      if (cursor) {
        seenCursors.add(cursor);
      }
    } while (cursor);
    return descendants;
  }

  private readThread(threadId: string): Promise<Record<string, unknown>> {
    const existing = this.threadReads.get(threadId);
    if (existing) {
      return existing;
    }
    const request = this.deps
      .request("thread/read", { includeTurns: true, threadId })
      .then((response) => {
        if (!(isRecord(response) && isRecord(response.thread))) {
          throw new Error(`Codex thread/read returned no thread: ${threadId}`);
        }
        return response.thread;
      })
      .catch((error: unknown) => {
        this.threadReads.delete(threadId);
        throw error;
      });
    this.threadReads.set(threadId, request);
    return request;
  }

  private replayThread(
    thread: Record<string, unknown>,
    options: ReplayOptions
  ): Promise<void> {
    const threadId = asString(thread.id);
    if (!threadId) {
      return Promise.resolve();
    }
    const replayActivities = !this.replayedActivities.has(threadId);
    const replayTranscript =
      options.includeTranscript && !this.replayedTranscripts.has(threadId);
    const replayTerminalStatus =
      options.replayTerminalStatus &&
      !this.replayedTerminalStatuses.has(threadId);
    if (!(replayActivities || replayTranscript || replayTerminalStatus)) {
      return Promise.resolve();
    }
    if (replayActivities) {
      this.replayedActivities.add(threadId);
    }
    if (replayTranscript) {
      this.replayedTranscripts.add(threadId);
    }
    if (replayTerminalStatus) {
      this.replayedTerminalStatuses.add(threadId);
    }
    this.replayItems(
      thread,
      threadId,
      options.inheritedTurnIds,
      replayActivities,
      replayTranscript
    );
    if (replayTerminalStatus) {
      this.replayLatestOwnedTurnStatus(
        thread,
        threadId,
        options.inheritedTurnIds
      );
    }
    return Promise.resolve();
  }

  private replayItems(
    thread: Record<string, unknown>,
    threadId: string,
    inheritedTurnIds: ReadonlySet<string>,
    replayActivities: boolean,
    replayTranscript: boolean
  ): void {
    for (const [turnIndex, turn] of readTurns(thread).entries()) {
      const turnId = readTurnId(threadId, turn, turnIndex);
      const inheritedTurn = inheritedTurnIds.has(turnId);
      for (const [itemIndex, item] of readItems(turn).entries()) {
        const ownedActivity =
          replayActivities && isOwnedSubagentActivity(thread, item);
        const ownedTranscript =
          replayTranscript && !inheritedTurn && isTranscriptItem(item);
        if (!(ownedActivity || ownedTranscript)) {
          continue;
        }
        this.deps.routeNotification("item/completed", {
          completedAtMs: itemTimestampMs(turn, itemIndex),
          item,
          threadId,
          turnId,
        });
      }
    }
  }

  private replayLatestOwnedTurnStatus(
    thread: Record<string, unknown>,
    threadId: string,
    inheritedTurnIds: ReadonlySet<string>
  ): void {
    const latestOwnedTurn = readTurns(thread)
      .filter(
        (turn, turnIndex) =>
          !inheritedTurnIds.has(readTurnId(threadId, turn, turnIndex))
      )
      .at(-1);
    if (!latestOwnedTurn) {
      return;
    }
    this.deps.routeNotification(
      asString(latestOwnedTurn.status) === "inProgress"
        ? "turn/started"
        : "turn/completed",
      { threadId, turn: latestOwnedTurn }
    );
  }
}

function collectAncestorTurnIds(
  thread: Record<string, unknown>,
  threadsById: ReadonlyMap<string, Record<string, unknown>>
): ReadonlySet<string> {
  const turnIds = new Set<string>();
  const seen = new Set<string>();
  let parentThreadId = readParentThreadId(thread);
  while (parentThreadId && !seen.has(parentThreadId)) {
    seen.add(parentThreadId);
    const parent = threadsById.get(parentThreadId);
    if (!parent) {
      break;
    }
    for (const [turnIndex, turn] of readTurns(parent).entries()) {
      turnIds.add(readTurnId(parentThreadId, turn, turnIndex));
    }
    parentThreadId = readParentThreadId(parent);
  }
  return turnIds;
}
