import { realpathSync } from "node:fs";
import path from "node:path";
import type { KitOutcome } from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import type { KitStatus } from "../../../../project-workflow/modules/workflow-kit/src/workflow-kit-facade.js";

/** Quiet time after a session working directory change before re-publishing. */
const DEFAULT_SESSION_DEBOUNCE_MS = 300;

type StatusTask = KitStatus["tasks"][number];

/** The execution mode of the plan; `sequential` without an execution block. */
export type PlanViewMode = "orchestrated" | "sequential";

/** One task row of the plan view, in plan order. */
export interface PlanViewRow {
  /** The task the work is on now (see `buildPlanView`). */
  current: boolean;
  /** The executor session bound to the task's assignment worktree, or null. */
  executorSessionId: string | null;
  kind: StatusTask["kind"];
  /** `parallel`/`sequential` in orchestrated mode; null in sequential mode. */
  label: "parallel" | "sequential" | null;
  status: StatusTask["status"];
  taskId: string;
  title: string;
}

/**
 * Core read model of the active plan for the sidebar (spec 10.2 of
 * `WorkflowKitExecutionModes.md`). The renderer only renders it.
 */
export interface PlanView {
  /** Every executor session bound to a task row. */
  boundSessionIds: string[];
  mode: PlanViewMode;
  objective: string;
  /** The session whose card carries the plan, or null. */
  ownerSessionId: string | null;
  progress: { done: number; total: number };
  rows: PlanViewRow[];
  scopeId: string;
  /** The scope status (`ACTIVE` or `BLOCKED`). */
  status: string;
}

/** The fields of a Core session record the plan view needs. */
export interface PlanViewSession {
  id: string;
  sessionKind?: string;
  sessionPurpose?: unknown;
  updatedAt: string;
  workingDirectory?: string;
  workspaceId: string;
}

/** The real absolute form of a path; a missing path keeps its resolved form. */
function canonical(value: string): string {
  const resolved = path.resolve(value);
  try {
    return realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

/** Whether `directory` is `root` or lies inside it. */
function within(directory: string, root: string): boolean {
  return (
    directory === root ||
    directory.startsWith(root.endsWith(path.sep) ? root : `${root}${path.sep}`)
  );
}

function newest<T extends { updatedAt: string }>(items: T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!best || item.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = item;
    }
  }
  return best;
}

/**
 * The owner: the Kit `execution.ownerSession` when it is a Core session of
 * the workspace, otherwise the most recently active (latest `updatedAt`)
 * primary session of the workspace — not a subagent, not a purpose session
 * such as Profile Creator.
 */
function ownerSession(
  kit: KitStatus,
  sessions: PlanViewSession[]
): string | null {
  const recorded = kit.execution?.ownerSession ?? null;
  if (recorded && sessions.some((session) => session.id === recorded)) {
    return recorded;
  }
  const primary = sessions.filter(
    (session) => session.sessionKind !== "subagent" && !session.sessionPurpose
  );
  return newest(primary)?.id ?? null;
}

/**
 * Task id -> executor session id. An assignment with a worktree is bound to
 * the subagent session whose working directory (real path) is the worktree
 * or lies inside it; several candidates resolve to the most recently
 * updated one, a later assignment of the same task wins.
 */
function executorBindings(
  kit: KitStatus,
  sessions: PlanViewSession[]
): Map<string, string> {
  const executors = sessions
    .filter(
      (session) =>
        session.sessionKind === "subagent" && session.workingDirectory
    )
    .map((session) => ({
      directory: canonical(session.workingDirectory as string),
      id: session.id,
      updatedAt: session.updatedAt,
    }));
  const bindings = new Map<string, string>();
  for (const assignment of kit.assignments) {
    if (!assignment.worktree) {
      continue;
    }
    const worktree = canonical(assignment.worktree);
    const bound = newest(
      executors.filter((executor) => within(executor.directory, worktree))
    );
    if (bound) {
      bindings.set(assignment.taskId, bound.id);
    }
  }
  return bindings;
}

function rowLabel(mode: PlanViewMode, task: StatusTask): PlanViewRow["label"] {
  if (mode !== "orchestrated") {
    return null;
  }
  return task.parallelSafe ? "parallel" : "sequential";
}

/**
 * Builds the plan view of a workspace from its Kit status and the Core
 * session records. Null when the status failed, the Kit is not installed or
 * the plan has no scope. A row is `current` when it is the Kit current task;
 * in orchestrated mode also when its task has an assignment that is not yet
 * integrated (an executor works on it).
 */
export function buildPlanView(
  outcome: KitOutcome<KitStatus>,
  workspaceId: string,
  sessions: PlanViewSession[]
): PlanView | null {
  if (!(outcome.ok && outcome.result.installed && outcome.result.scope)) {
    return null;
  }
  const kit = outcome.result;
  const scope = outcome.result.scope;
  const own = sessions.filter((session) => session.workspaceId === workspaceId);
  const mode: PlanViewMode =
    kit.execution?.strategy === "orchestrated" ? "orchestrated" : "sequential";
  const bindings = executorBindings(kit, own);
  const working = new Set(
    mode === "orchestrated"
      ? kit.assignments
          .filter((assignment) => assignment.status !== "INTEGRATED")
          .map((assignment) => assignment.taskId)
      : []
  );
  const rows = kit.tasks.map(
    (task): PlanViewRow => ({
      current: task.id === kit.currentTask?.id || working.has(task.id),
      executorSessionId: bindings.get(task.id) ?? null,
      kind: task.kind,
      label: rowLabel(mode, task),
      status: task.status,
      taskId: task.id,
      title: task.title,
    })
  );
  return {
    boundSessionIds: [...new Set(bindings.values())],
    mode,
    objective: scope.objective,
    ownerSessionId: ownerSession(kit, own),
    progress: { done: kit.progress.done, total: kit.progress.total },
    rows,
    scopeId: scope.id,
    status: scope.status,
  };
}

export interface PlanViewSessionWatchOptions {
  debounceMs?: number;
  /** Core sessions: the list of all records and the session event stream. */
  list: () => PlanViewSession[];
  /** Called once per quiet period for a workspace whose executors changed. */
  onChange: (workspaceId: string) => void;
  subscribe: (listener: (event: unknown) => void) => () => void;
}

/**
 * Follows `session:created`/`session:updated` events and reports the
 * workspace of a subagent session whose working directory appeared or
 * changed, debounced per workspace, so the plan view binds a newly started
 * executor without waiting for a Kit file change.
 */
export class PlanViewSessionWatch {
  private readonly directories = new Map<string, string>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly options: PlanViewSessionWatchOptions;
  private readonly unsubscribe: () => void;

  constructor(options: PlanViewSessionWatchOptions) {
    this.options = options;
    this.unsubscribe = options.subscribe((event) => this.handle(event));
  }

  close(): void {
    this.unsubscribe();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  private handle(event: unknown): void {
    const record =
      event && typeof event === "object"
        ? (event as { payload?: { sessionId?: unknown }; type?: unknown })
        : {};
    const sessionId = record.payload?.sessionId;
    if (
      !(record.type === "session:created" || record.type === "session:updated")
    ) {
      return;
    }
    if (typeof sessionId !== "string") {
      return;
    }
    const session = this.options
      .list()
      .find((candidate) => candidate.id === sessionId);
    const directory = session?.workingDirectory;
    if (!(session && session.sessionKind === "subagent" && directory)) {
      return;
    }
    if (this.directories.get(session.id) === directory) {
      return;
    }
    this.directories.set(session.id, directory);
    this.schedule(session.workspaceId);
  }

  private schedule(workspaceId: string): void {
    const pending = this.timers.get(workspaceId);
    if (pending) {
      clearTimeout(pending);
    }
    const timer = setTimeout(() => {
      this.timers.delete(workspaceId);
      this.options.onChange(workspaceId);
    }, this.options.debounceMs ?? DEFAULT_SESSION_DEBOUNCE_MS);
    timer.unref?.();
    this.timers.set(workspaceId, timer);
  }
}
