import { existsSync } from "node:fs";
import path from "node:path";
import type {
  KitFailure,
  KitOutcome,
  WorkflowHostFacade,
} from "../../../../project-workflow/modules/workflow-host/src/workflow-host-facade.js";
import type {
  InspectResult,
  InstallOutcome,
} from "../../../../project-workflow/modules/workflow-installer/src/workflow-installer-facade.js";
import type { KitStatus } from "../../../../project-workflow/modules/workflow-kit/src/workflow-kit-facade.js";
import {
  type SessionWorkflowAutopilot,
  sessionWorkflowAutopilot,
  type WorkflowAutopilotSnapshot,
} from "../../../../session-runtime/modules/session-request-handler/src/session-workflow-autopilot.js";
import type { HarnessWorkspace } from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { CoreEventListener } from "./core-provider-lifecycle.js";
import {
  CoreWorkflowModeChoice,
  type ModeChoiceDependencies,
} from "./core-workflow-mode-choice.js";
import {
  buildPlanView,
  type PlanView,
  type PlanViewSession,
  PlanViewSessionWatch,
} from "./core-workflow-plan-view.js";
import { CoreWorkflowWatch } from "./core-workflow-watch.js";

/** Core event published after every Workflow Kit operation of a workspace. */
export const WORKFLOW_STATUS_EVENT_TYPE = "workflow:status";

const PROJECT_WORKFLOW_METHODS = new Set([
  "workflow-autopilot-get",
  "workflow-autopilot-set",
  "workflow-doctor",
  "workflow-inspect",
  "workflow-mode-choice-get",
  "workflow-mode-choose",
  "workflow-prepare-project",
  "workflow-status",
]);
/** The Kit plan file; executor changes re-publish only with a plan. */
const PLAN_FILE = path.join(".harness", "plans", "todo-plan.md");
/** A new project folder name: one path segment, no separators. */
const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/u;

export interface ProjectWorkflowDependencies {
  /** Registers and selects a workspace (the existing Core route). */
  addWorkspace: (workspacePath: string) => HarnessWorkspace;
  /** The Core autopilot executor; defaults to the shared instance. */
  autopilot?: Pick<
    SessionWorkflowAutopilot,
    "get" | "setEnabled" | "subscribe"
  >;
  host: Pick<
    WorkflowHostFacade,
    | "bundle"
    | "chooseScope"
    | "doctor"
    | "inspect"
    | "install"
    | "proposal"
    | "status"
    | "writeRuntimeFile"
  >;
  /**
   * Core sessions for the execution mode card and the plan view; `list`
   * returns every Core session record.
   */
  sessions: ModeChoiceDependencies["sessions"] & {
    list: () => PlanViewSession[];
  };
  /** Quiet time of the Kit state watcher; tests pass a short one. */
  watchDebounceMs?: number;
  /** Known workspaces and the active one. */
  workspaces: () => { active: HarnessWorkspace; known: HarnessWorkspace[] };
}

/** The `workflow-status` result: the Kit outcome plus the Core plan view. */
export type WorkflowStatusResult = KitOutcome<KitStatus> & {
  planView: PlanView | null;
};

export interface PreparedProject {
  inspect: InspectResult;
  install: InstallOutcome | null;
  ok: true;
  status: KitOutcome<KitStatus>;
  workspace: HarnessWorkspace;
}

function invalid(message: string, code = "INVALID_REQUEST"): KitFailure {
  return { code, message, nextAction: null, ok: false };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

/** The folder of a "new" request (`path` is the parent) or an "open" one. */
function targetFolder(
  record: Record<string, unknown>
): KitFailure | { mode: "new" | "open"; name: string; target: string } {
  const mode = record.mode;
  const folder = readText(record, "path");
  const name = readText(record, "name");
  if (mode !== "new" && mode !== "open") {
    return invalid('mode must be "new" or "open".');
  }
  if (!(folder && path.isAbsolute(folder))) {
    return invalid("path must be an absolute folder path.");
  }
  if (mode === "open") {
    return { mode, name, target: path.resolve(folder) };
  }
  if (
    !name ||
    name === "." ||
    name === ".." ||
    INVALID_NAME_PATTERN.test(name)
  ) {
    return invalid("name must be a folder name without separators.");
  }
  return { mode, name, target: path.join(path.resolve(folder), name) };
}

/** Why a folder cannot be prepared in this mode, or null. */
function refusal(
  inspect: InspectResult,
  mode: "new" | "open"
): KitFailure | null {
  if (
    mode === "new" &&
    !(inspect.state === "MISSING" || inspect.state === "EMPTY")
  ) {
    return {
      ...invalid(
        "The folder already exists and is not empty.",
        "PROJECT_EXISTS"
      ),
      details: { inspect },
    };
  }
  if (mode === "open" && inspect.action === "create") {
    return {
      ...invalid("The folder does not exist.", "FOLDER_MISSING"),
      details: { inspect },
    };
  }
  if (inspect.action === "unsupported") {
    return {
      ...invalid(
        inspect.nestedIn
          ? `The folder is inside the repository ${inspect.nestedIn}; open its top level.`
          : "The folder uses Workflow Pilot, which this release does not support.",
        "UNSUPPORTED_FOLDER"
      ),
      details: { inspect },
    };
  }
  return null;
}

/**
 * Core RPC for project workflow: folder inspection, project preparation
 * (install or update, then registration as a workspace), Kit status, the
 * project doctor, the per-session autopilot switch and the execution mode
 * card. Every operation on a workspace publishes `workflow:status`;
 * autopilot changes and decisions publish `workflow:autopilot`; mode card
 * changes publish `workflow:mode-choice`. The Kit state of known workspaces
 * (plan file, assignments, integration, proposal) is watched, and every
 * change publishes `workflow:status` as well. Every `workflow:status` event
 * and the `workflow-status` result carry the Core plan view (`planView`),
 * re-published when an executor session reports a new working directory.
 */
export class CoreProjectWorkflowRpc {
  private readonly listeners = new Set<CoreEventListener>();
  private readonly dependencies: ProjectWorkflowDependencies;
  private readonly autopilot: NonNullable<
    ProjectWorkflowDependencies["autopilot"]
  >;
  private readonly modeChoice: CoreWorkflowModeChoice;
  private readonly watch: CoreWorkflowWatch;
  private readonly sessionWatch: PlanViewSessionWatch;

  constructor(dependencies: ProjectWorkflowDependencies) {
    this.dependencies = dependencies;
    this.autopilot = dependencies.autopilot ?? sessionWorkflowAutopilot;
    // Autopilot decisions reach the renderer as `workflow:autopilot` events.
    this.autopilot.subscribe((event) => this.emit(event));
    this.modeChoice = new CoreWorkflowModeChoice({
      host: dependencies.host,
      publish: (event) => this.emit(event),
      sessions: dependencies.sessions,
    });
    this.watch = new CoreWorkflowWatch({
      debounceMs: dependencies.watchDebounceMs,
      onChange: (workspaceId) => this.publishWatched(workspaceId),
    });
    this.sessionWatch = new PlanViewSessionWatch({
      debounceMs: dependencies.watchDebounceMs,
      list: () => dependencies.sessions.list(),
      onChange: (workspaceId) => this.publishExecutors(workspaceId),
      subscribe: (listener) => dependencies.sessions.subscribe(listener),
    });
  }

  static handles(method: string): boolean {
    return PROJECT_WORKFLOW_METHODS.has(method);
  }

  subscribe(listener: CoreEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Watches the Kit state of every known workspace with an installed Kit and
   * stops watching removed ones; Core calls it after the registry changes.
   */
  watchWorkspaces(): void {
    this.watch.sync(this.dependencies.workspaces().known);
  }

  /** Stops the Kit state watchers (Core shutdown). */
  close(): void {
    this.watch.close();
    this.sessionWatch.close();
  }

  /** A message the user typed into a session (the `send-message` route). */
  userMessage(sessionId: string): void {
    this.modeChoice.userMessage(sessionId);
  }

  invoke(method: string, payload: unknown): Promise<unknown> {
    const record = readRecord(payload);
    switch (method) {
      case "workflow-inspect": {
        const folder = readText(record, "path");
        return folder && path.isAbsolute(folder)
          ? this.dependencies.host.inspect(folder)
          : Promise.resolve(invalid("path must be an absolute folder path."));
      }
      case "workflow-prepare-project":
        return this.prepare(record);
      case "workflow-status":
        return this.status(readText(record, "workspaceId"));
      case "workflow-doctor":
        return this.doctor(
          readText(record, "workspaceId"),
          record.fix === true
        );
      case "workflow-autopilot-get":
        return Promise.resolve(
          this.autopilotGet(readText(record, "sessionId"))
        );
      case "workflow-autopilot-set":
        return this.autopilotSet(readText(record, "sessionId"), record.enabled);
      case "workflow-mode-choice-get":
        return Promise.resolve(
          this.modeChoice.get(readText(record, "workspaceId"))
        );
      case "workflow-mode-choose":
        return this.modeChoice.choose(payload);
      default:
        return Promise.resolve(
          invalid(`Unknown project workflow method: ${method}`)
        );
    }
  }

  private autopilotGet(
    sessionId: string
  ): KitFailure | { autopilot: WorkflowAutopilotSnapshot; ok: true } {
    return sessionId
      ? { autopilot: this.autopilot.get(sessionId), ok: true }
      : invalid("sessionId is required.");
  }

  private async autopilotSet(
    sessionId: string,
    enabled: unknown
  ): Promise<KitFailure | { autopilot: WorkflowAutopilotSnapshot; ok: true }> {
    if (!sessionId || typeof enabled !== "boolean") {
      return invalid("sessionId and a boolean enabled are required.");
    }
    return {
      autopilot: await this.autopilot.setEnabled(sessionId, enabled),
      ok: true,
    };
  }

  private workspace(workspaceId: string): HarnessWorkspace | null {
    const { active, known } = this.dependencies.workspaces();
    if (!workspaceId) {
      return active;
    }
    return known.find((item) => item.id === workspaceId) ?? null;
  }

  private async prepare(
    record: Record<string, unknown>
  ): Promise<KitFailure | PreparedProject> {
    const target = targetFolder(record);
    if (!("target" in target)) {
      return target;
    }
    const { host } = this.dependencies;
    const inspected = await host.inspect(target.target);
    if (!inspected.ok) {
      return inspected;
    }
    // "Open Without Kit" registers any existing folder, as before the Kit.
    const withoutKit = target.mode === "open" && record.install === false;
    const refused =
      withoutKit && inspected.result.action !== "create"
        ? null
        : refusal(inspected.result, target.mode);
    if (refused) {
      return refused;
    }
    let install: InstallOutcome | null = null;
    const action = inspected.result.action;
    if (
      !withoutKit &&
      (action === "create" ||
        action === "install" ||
        action === "install-migrate" ||
        action === "update")
    ) {
      // The host marker makes the Kit require the mode choice (scope:propose);
      // `update` keeps an existing marker.
      const installed = await host.install(target.target, {
        host: "harness",
        name: target.name || undefined,
        update: action === "update",
      });
      if (!installed.ok) {
        return installed;
      }
      install = installed.result;
    }
    const workspace = this.dependencies.addWorkspace(target.target);
    host.writeRuntimeFile(workspace.path);
    this.watchWorkspaces();
    const { status } = await this.publishStatus(workspace);
    return { inspect: inspected.result, install, ok: true, status, workspace };
  }

  private async status(
    workspaceId: string
  ): Promise<KitFailure | WorkflowStatusResult> {
    const workspace = this.workspace(workspaceId);
    if (!workspace) {
      return invalid("Unknown workspace.", "UNKNOWN_WORKSPACE");
    }
    this.dependencies.host.writeRuntimeFile(workspace.path);
    const { planView, status } = await this.publishStatus(workspace);
    return { ...status, planView };
  }

  private async doctor(workspaceId: string, fix: boolean): Promise<unknown> {
    const workspace = this.workspace(workspaceId);
    if (!workspace) {
      return invalid("Unknown workspace.", "UNKNOWN_WORKSPACE");
    }
    const report = await this.dependencies.host.doctor(workspace.path, fix);
    await this.publishStatus(workspace);
    return report;
  }

  private publishWatched(workspaceId: string): void {
    const workspace = this.dependencies
      .workspaces()
      .known.find((item) => item.id === workspaceId);
    if (workspace) {
      this.publishStatus(workspace).catch(() => undefined);
    }
  }

  /** Re-publishes after an executor session change; only with a Kit plan. */
  private publishExecutors(workspaceId: string): void {
    const workspace = this.dependencies
      .workspaces()
      .known.find((item) => item.id === workspaceId);
    if (workspace && existsSync(path.join(workspace.path, PLAN_FILE))) {
      this.publishWatched(workspaceId);
    }
  }

  private async publishStatus(workspace: HarnessWorkspace): Promise<{
    planView: PlanView | null;
    status: KitOutcome<KitStatus>;
  }> {
    const status = await this.dependencies.host.status(workspace.path);
    const planView = buildPlanView(
      status,
      workspace.id,
      this.dependencies.sessions.list()
    );
    this.emit({
      path: workspace.path,
      planView,
      status,
      type: WORKFLOW_STATUS_EVENT_TYPE,
      workspaceId: workspace.id,
    });
    return { planView, status };
  }

  private emit(event: unknown): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
