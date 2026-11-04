import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { providerHomeManagerFacade } from "../../../../../../provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.js";
import { providerWorkspaceProvisionerFacade } from "../../../../../../provider-runtime/clusters/provider-readiness/modules/provider-workspace-provisioner/src/provider-workspace-provisioner-facade.js";
import { sessionRequestHandlerFacade } from "../../../../session-runtime/modules/session-request-handler/src/session-request-handler-facade.js";
import {
  type HarnessWorkspace,
  type WorkspaceRegistrySnapshot,
  workspaceRegistryFacade,
} from "../../../../workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.js";

const WORKSPACE_METHODS = new Set([
  "add-workspace",
  "list-workspaces",
  "remove-workspace",
  "select-workspace",
]);

export interface WorkspaceList {
  /** `null` when no project is active (the registry may be empty). */
  activeWorkspaceId: string | null;
  workspaces: HarnessWorkspace[];
}

export type RemoveWorkspaceResult =
  | (WorkspaceList & { ok: true })
  | {
      code: "UNKNOWN_WORKSPACE";
      error: string;
      ok: false;
    };

export interface CoreWorkspaceRpcDependencies {
  /**
   * Re-registers provider adapters for the active workspace (clears them
   * when no project is active).
   */
  registerAdapters: () => void;
  /** Registry snapshot file; defaults to `<HARNESS_AI_HOME>/workspaces.json`. */
  registryFile?: string;
}

/**
 * Core RPC for the workspace registry: list, add (open), select and remove a
 * project. The registry snapshot persists in `workspaces.json`; a missing or
 * empty file means no projects and no active project. Changing the active
 * workspace re-registers provider adapters and provisions the workspace.
 * Removing a project forgets every app reference to it (registry
 * entry, sessions loaded in Core, app-level provider home residue) and never
 * touches the project folder.
 */
export class CoreWorkspaceRpc {
  private readonly dependencies: CoreWorkspaceRpcDependencies;
  private readonly registryFile: string;

  constructor(dependencies: CoreWorkspaceRpcDependencies) {
    this.dependencies = dependencies;
    this.registryFile =
      dependencies.registryFile ??
      join(
        process.env.HARNESS_AI_HOME || join(homedir(), ".harness-ai"),
        "workspaces.json"
      );
  }

  static handles(method: string): boolean {
    return WORKSPACE_METHODS.has(method);
  }

  /** Loads the persisted registry; returns the known workspaces. */
  restore(): HarnessWorkspace[] {
    const snapshot = this.loadSnapshot();
    if (snapshot) {
      workspaceRegistryFacade.restoreSnapshot(snapshot);
    }
    return workspaceRegistryFacade.getKnownWorkspaces();
  }

  invoke(method: string, payload: unknown): unknown {
    const value = typeof payload === "string" ? payload : "";
    switch (method) {
      case "list-workspaces":
        return this.list();
      case "add-workspace":
        return this.add(value);
      case "select-workspace":
        return this.select(value);
      case "remove-workspace":
        return this.remove(readWorkspaceId(payload));
      default:
        return { error: `Unknown workspace method: ${method}`, ok: false };
    }
  }

  add(workspacePath: string): { ok: true; workspace: HarnessWorkspace } {
    const workspace = workspaceRegistryFacade.addWorkspace(workspacePath);
    workspaceRegistryFacade.selectWorkspace(workspace.id);
    this.activate();
    return { ok: true, workspace };
  }

  /** Provisions the active workspace; does nothing without one. */
  startProvisioning(): void {
    const workspace = workspaceRegistryFacade.getActiveWorkspace();
    if (!workspace) {
      return;
    }
    providerWorkspaceProvisionerFacade
      .provisionWorkspace({
        workspaceId: workspace.id,
        workspacePath: workspace.path,
      })
      .catch(() => undefined);
  }

  private list(): WorkspaceList {
    return {
      activeWorkspaceId:
        workspaceRegistryFacade.getActiveWorkspace()?.id ?? null,
      workspaces: workspaceRegistryFacade.getKnownWorkspaces(),
    };
  }

  private select(
    workspaceId: string
  ): { error: string; ok: false } | { ok: true; workspace: unknown } {
    try {
      const workspace = workspaceRegistryFacade.selectWorkspace(workspaceId);
      this.activate();
      return { ok: true, workspace };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
      };
    }
  }

  private async remove(workspaceId: string): Promise<RemoveWorkspaceResult> {
    const workspace = workspaceRegistryFacade
      .getKnownWorkspaces()
      .find((item) => item.id === workspaceId);
    if (!workspace) {
      return {
        code: "UNKNOWN_WORKSPACE",
        error: `Unknown workspace: ${workspaceId}`,
        ok: false,
      };
    }
    const wasActive =
      workspaceRegistryFacade.getActiveWorkspace()?.id === workspaceId;
    workspaceRegistryFacade.removeWorkspace(workspaceId);
    this.saveSnapshot();
    sessionRequestHandlerFacade.releaseWorkspaceSessions(workspaceId);
    await providerHomeManagerFacade
      .removeWorkspaceResidue(workspace.path)
      .catch(() => []);
    // The first remaining project (or none) is now active.
    if (wasActive) {
      this.dependencies.registerAdapters();
      this.startProvisioning();
    }
    return { ...this.list(), ok: true };
  }

  private activate(): void {
    this.saveSnapshot();
    this.dependencies.registerAdapters();
    this.startProvisioning();
  }

  private loadSnapshot(): WorkspaceRegistrySnapshot | null {
    if (!existsSync(this.registryFile)) {
      return null;
    }
    try {
      const snapshot = JSON.parse(
        readFileSync(this.registryFile, "utf8")
      ) as unknown;
      return snapshot &&
        typeof snapshot === "object" &&
        "workspaces" in snapshot &&
        (snapshot as { workspaces?: unknown }).workspaces
        ? (snapshot as WorkspaceRegistrySnapshot)
        : null;
    } catch {
      return null;
    }
  }

  private saveSnapshot(): void {
    mkdirSync(dirname(this.registryFile), { recursive: true });
    writeFileSync(
      this.registryFile,
      JSON.stringify(workspaceRegistryFacade.getSnapshot(), null, 2),
      "utf8"
    );
  }
}

function readWorkspaceId(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  const value =
    payload && typeof payload === "object"
      ? (payload as { workspaceId?: unknown }).workspaceId
      : undefined;
  return typeof value === "string" ? value : "";
}
