import { existsSync, type FSWatcher, watch } from "node:fs";
import path from "node:path";

/** Quiet time after the last change before the status is published. */
const DEFAULT_DEBOUNCE_MS = 300;
/** Delay before a watcher that reported an error is armed again. */
const RETRY_MS = 1000;
const PLAN_FILE = "todo-plan.md";
const SEPARATOR_PATTERN = /[\\/]/u;
/** Kit local state the status reads: assignments, integration, proposal. */
const LOCAL_ENTRIES = new Set([
  "assignments",
  "integration.json",
  "scope-proposal.json",
]);

export interface WatchedWorkspace {
  id: string;
  path: string;
}

export interface WorkflowWatchOptions {
  debounceMs?: number;
  /** Called once per quiet period after a watched change of the workspace. */
  onChange: (workspaceId: string) => void;
}

interface WatchTarget {
  directory: string;
  recursive: boolean;
  /** Whether a change of this entry (relative to the directory) matters. */
  relevant: (name: string | null) => boolean;
}

function firstSegment(name: string): string {
  return name.split(SEPARATOR_PATTERN)[0] ?? "";
}

function planTarget(root: string): WatchTarget {
  return {
    directory: path.join(root, ".harness", "plans"),
    recursive: false,
    relevant: (name) => name === null || name === PLAN_FILE,
  };
}

function localTarget(root: string): WatchTarget {
  return {
    directory: path.join(root, ".harness", "workflow", "local"),
    recursive: true,
    relevant: (name) => !name || LOCAL_ENTRIES.has(firstSegment(name)),
  };
}

/** The nearest existing ancestor of `directory` inside `root`, or null. */
function nearestExisting(root: string, directory: string): string | null {
  let current = path.dirname(directory);
  const stop = path.dirname(root);
  while (current !== stop && current !== path.dirname(current)) {
    if (existsSync(current)) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

/**
 * Watches one directory; while it is missing it watches the nearest existing
 * ancestor and arms itself on the directory once it appears. Errors close the
 * watcher and arm it again after a short delay.
 */
class DirectoryWatch {
  private closed = false;
  private readonly root: string;
  private readonly target: WatchTarget;
  private readonly changed: () => void;
  private retry: NodeJS.Timeout | null = null;
  private watcher: FSWatcher | null = null;

  constructor(root: string, target: WatchTarget, changed: () => void) {
    this.root = root;
    this.target = target;
    this.changed = changed;
    this.arm();
  }

  close(): void {
    this.closed = true;
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
    this.watcher?.close();
    this.watcher = null;
  }

  private arm(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.closed) {
      return;
    }
    const { directory, recursive, relevant } = this.target;
    if (existsSync(directory)) {
      this.watcher = this.open(directory, recursive, (name) => {
        if (!existsSync(directory)) {
          // The directory itself went away: fall back to its ancestor.
          this.arm();
          this.changed();
        } else if (relevant(name)) {
          this.changed();
        }
      });
      return;
    }
    const ancestor = nearestExisting(this.root, directory);
    if (!ancestor) {
      return;
    }
    this.watcher = this.open(ancestor, false, () => {
      if (existsSync(directory)) {
        this.arm();
        this.changed();
      } else if (!existsSync(ancestor)) {
        this.arm();
      }
    });
  }

  private open(
    directory: string,
    recursive: boolean,
    listener: (name: string | null) => void
  ): FSWatcher | null {
    let watcher: FSWatcher;
    try {
      watcher = watch(directory, { recursive }, (_event, name) =>
        listener(name === null ? null : String(name))
      );
    } catch {
      if (!recursive) {
        return null;
      }
      // Platforms without recursive watching still see direct entries.
      return this.open(directory, false, listener);
    }
    watcher.on("error", () => {
      if (this.watcher !== watcher) {
        return;
      }
      watcher.close();
      this.watcher = null;
      this.retry = setTimeout(() => {
        this.retry = null;
        this.arm();
      }, RETRY_MS);
    });
    return watcher;
  }
}

interface WorkspaceWatch {
  local: DirectoryWatch;
  path: string;
  plan: DirectoryWatch;
  timer: NodeJS.Timeout | null;
}

/**
 * Core watcher of the Workflow Kit state of known workspaces (spec 10.1 of
 * WorkflowKitExecutionModes.md): the plan file and the Kit local state
 * (assignments, integration journal, scope proposal). A change reports the
 * workspace once per quiet period; the caller publishes the status. No
 * renderer is involved.
 */
export class CoreWorkflowWatch {
  private readonly debounceMs: number;
  private readonly onChange: (workspaceId: string) => void;
  private readonly watches = new Map<string, WorkspaceWatch>();

  constructor(options: WorkflowWatchOptions) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.onChange = options.onChange;
  }

  /**
   * Watches every given workspace whose Kit is installed (the plan file
   * exists) and stops watching every other one.
   */
  sync(known: readonly WatchedWorkspace[]): void {
    const wanted = new Map(
      known
        .filter((workspace) =>
          existsSync(path.join(workspace.path, ".harness", "plans", PLAN_FILE))
        )
        .map((workspace) => [workspace.id, workspace])
    );
    for (const [id, entry] of this.watches) {
      if (wanted.get(id)?.path !== entry.path) {
        this.stop(id);
      }
    }
    for (const workspace of wanted.values()) {
      if (!this.watches.has(workspace.id)) {
        this.start(workspace);
      }
    }
  }

  /** Stops every watcher (Core shutdown). */
  close(): void {
    for (const id of [...this.watches.keys()]) {
      this.stop(id);
    }
  }

  private start(workspace: WatchedWorkspace): void {
    const changed = () => this.schedule(workspace.id);
    this.watches.set(workspace.id, {
      local: new DirectoryWatch(
        workspace.path,
        localTarget(workspace.path),
        changed
      ),
      path: workspace.path,
      plan: new DirectoryWatch(
        workspace.path,
        planTarget(workspace.path),
        changed
      ),
      timer: null,
    });
  }

  private stop(id: string): void {
    const entry = this.watches.get(id);
    if (!entry) {
      return;
    }
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.plan.close();
    entry.local.close();
    this.watches.delete(id);
  }

  private schedule(id: string): void {
    const entry = this.watches.get(id);
    if (!entry) {
      return;
    }
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.timer = setTimeout(() => {
      entry.timer = null;
      if (this.watches.get(id) === entry) {
        this.onChange(id);
      }
    }, this.debounceMs);
  }
}
