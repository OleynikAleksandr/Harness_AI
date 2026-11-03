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
import type { HarnessWorkspace } from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";
import type { CoreEventListener } from "./core-provider-lifecycle.js";

/** Core event published after every Workflow Kit operation of a workspace. */
export const WORKFLOW_STATUS_EVENT_TYPE = "workflow:status";

const PROJECT_WORKFLOW_METHODS = new Set([
  "workflow-doctor",
  "workflow-inspect",
  "workflow-prepare-project",
  "workflow-status",
]);
/** A new project folder name: one path segment, no separators. */
const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/u;

export interface ProjectWorkflowDependencies {
  /** Registers and selects a workspace (the existing Core route). */
  addWorkspace: (workspacePath: string) => HarnessWorkspace;
  host: Pick<
    WorkflowHostFacade,
    "doctor" | "inspect" | "install" | "status" | "writeRuntimeFile"
  >;
  /** Known workspaces and the active one. */
  workspaces: () => { active: HarnessWorkspace; known: HarnessWorkspace[] };
}

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
 * (install or update, then registration as a workspace), Kit status and the
 * project doctor. Every operation on a workspace publishes `workflow:status`.
 */
export class CoreProjectWorkflowRpc {
  private readonly listeners = new Set<CoreEventListener>();
  private readonly dependencies: ProjectWorkflowDependencies;

  constructor(dependencies: ProjectWorkflowDependencies) {
    this.dependencies = dependencies;
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
      default:
        return Promise.resolve(
          invalid(`Unknown project workflow method: ${method}`)
        );
    }
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
    const refused = refusal(inspected.result, target.mode);
    if (refused) {
      return refused;
    }
    let install: InstallOutcome | null = null;
    const action = inspected.result.action;
    if (
      action === "create" ||
      action === "install" ||
      action === "install-migrate" ||
      action === "update"
    ) {
      const installed = await host.install(target.target, {
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
    const status = await this.publishStatus(workspace);
    return { inspect: inspected.result, install, ok: true, status, workspace };
  }

  private status(workspaceId: string): Promise<KitOutcome<KitStatus>> {
    const workspace = this.workspace(workspaceId);
    if (!workspace) {
      return Promise.resolve(
        invalid("Unknown workspace.", "UNKNOWN_WORKSPACE")
      );
    }
    this.dependencies.host.writeRuntimeFile(workspace.path);
    return this.publishStatus(workspace);
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

  private async publishStatus(
    workspace: HarnessWorkspace
  ): Promise<KitOutcome<KitStatus>> {
    const status = await this.dependencies.host.status(workspace.path);
    const event = {
      path: workspace.path,
      status,
      type: WORKFLOW_STATUS_EVENT_TYPE,
      workspaceId: workspace.id,
    };
    for (const listener of this.listeners) {
      listener(event);
    }
    return status;
  }
}
