import { chmodSync, mkdirSync } from "node:fs";
import path from "node:path";
import type {
  CommitResult,
  WorkflowGitFacade,
} from "../../workflow-git/src/workflow-git-facade.js";
import {
  PLAN_PATH,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import {
  ensure,
  RUNTIME_FILE,
  WorkflowError,
  workflowPlatformFacade,
} from "../../workflow-platform/src/workflow-platform-facade.js";
import { workflowQualityFacade } from "../../workflow-quality/src/workflow-quality-facade.js";
import { type FolderState, inspectFolder } from "./installer-inspect.js";
import {
  buildManifest,
  buildPayload,
  KIT_VERSION,
  MANIFEST_PATH,
  OWN_HOOKS_DIR,
  type PayloadEntry,
  renderManifest,
} from "./installer-payload.js";

export interface InstallOptions {
  /** Text of the Kit bundle copied into the project. */
  bundle: string;
  name?: string;
  /** Runtime recorded for the launchers (Electron inside Harness). */
  runtime?: { executable: string; mode: "electron" | "node" } | null;
  update?: boolean;
}

export interface InstallOutcome {
  commit: CommitResult | null;
  /** Changes that existed before and stay out of the commit. */
  excluded: string[];
  hooksPath: string;
  migrationRequired: boolean;
  previousState: FolderState;
  root: string;
  version: string;
  written: string[];
}

const KIT_STATES = new Set<FolderState>([
  "KIT_DAMAGED",
  "KIT_OK",
  "KIT_OUTDATED",
]);
const SLUG_DROP = /[^a-z0-9]+/gu;
const SLUG_TRIM = /^-+|-+$/gu;

export function projectSlug(name: string): string {
  return (
    name.toLowerCase().replace(SLUG_DROP, "-").replace(SLUG_TRIM, "") ||
    "project"
  );
}

function file(root: string, relative: string): string {
  return path.join(root, ...relative.split("/"));
}

/** Local `core.hooksPath` relative to the root, or null when unset. */
function localHooksPath(git: WorkflowGitFacade, root: string): string | null {
  const value = git.git
    .run(root, ["config", "--local", "--get", "core.hooksPath"], {
      allowFailure: true,
    })
    .stdout.trim();
  if (value === "") {
    return null;
  }
  let relative: string;
  try {
    relative = workflowPlatformFacade.relativeFromRoot(
      root,
      path.resolve(root, value)
    );
  } catch {
    throw new WorkflowError(
      "HOOKS_PATH_OUTSIDE",
      `core.hooksPath points outside the project: ${value}`
    );
  }
  return relative === OWN_HOOKS_DIR ? null : relative;
}

function writeIfChanged(
  root: string,
  relative: string,
  next: string,
  executable: boolean
): boolean {
  const target = file(root, relative);
  const changed = workflowPlatformFacade.readTextIfExists(target) !== next;
  if (changed) {
    workflowPlatformFacade.writeFileAtomic(target, next);
  }
  if (executable && process.platform !== "win32") {
    chmodSync(target, 0o755);
  }
  return changed;
}

function checkPreconditions(
  state: FolderState,
  update: boolean,
  nestedIn: string | null,
  pending: boolean
): void {
  ensure(
    !nestedIn,
    "NESTED_REPOSITORY",
    `The folder is inside the repository ${nestedIn}; choose its top level or another folder.`
  );
  ensure(
    state !== "PILOT_KIT",
    "PILOT_KIT_UNSUPPORTED",
    "This project uses Workflow Pilot (Kit 1.x), which Harness does not support."
  );
  ensure(
    !pending,
    "TRANSACTION_PENDING",
    "A Kit commit transaction is unfinished.",
    {},
    "Run `scripts/workflow repair`."
  );
  if (update) {
    ensure(
      KIT_STATES.has(state),
      "NOT_INSTALLED",
      "The Workflow Kit is not installed here; install it first."
    );
  } else {
    ensure(
      !KIT_STATES.has(state),
      "ALREADY_INSTALLED",
      "The Workflow Kit is already installed.",
      {},
      "Use `install --update` or `doctor --fix`."
    );
  }
}

function writePayload(root: string, entries: PayloadEntry[]): string[] {
  const written: string[] = [];
  for (const entry of entries) {
    const current = workflowPlatformFacade.readTextIfExists(
      file(root, entry.path)
    );
    if (
      writeIfChanged(root, entry.path, entry.render(current), entry.executable)
    ) {
      written.push(entry.path);
    }
  }
  return written;
}

/** Writes configuration, manifest and runtime; returns the written paths. */
function writeState(
  root: string,
  entries: PayloadEntry[],
  runtime: InstallOptions["runtime"]
): string[] {
  const written: string[] = [];
  if (
    !workflowPlatformFacade.readTextIfExists(
      workflowQualityFacade.configFile(root)
    )
  ) {
    workflowQualityFacade.writeConfig(
      root,
      workflowQualityFacade.defaultConfig()
    );
    written.push(workflowQualityFacade.configPath);
  }
  if (
    writeIfChanged(
      root,
      MANIFEST_PATH,
      renderManifest(buildManifest(entries)),
      false
    )
  ) {
    written.push(MANIFEST_PATH);
  }
  if (runtime) {
    workflowPlatformFacade.writeFileAtomic(
      file(root, RUNTIME_FILE),
      workflowPlatformFacade.formatRuntimeFile(runtime.executable, runtime.mode)
    );
  }
  return written;
}

function scopeOf(planText: string, legacy: boolean): string | null {
  if (legacy) {
    return null;
  }
  try {
    return workflowPlanFacade.parse(planText).scope?.id ?? null;
  } catch {
    return null;
  }
}

function commitInstall(
  git: WorkflowGitFacade,
  root: string,
  files: string[],
  planText: string,
  update: boolean,
  scopeId: string | null
): CommitResult | null {
  try {
    return git.transactions.commit(root, {
      files,
      message: update
        ? `chore: update workflow kit to ${KIT_VERSION}`
        : `chore: install workflow kit ${KIT_VERSION}`,
      planPath: PLAN_PATH,
      planText,
      role: update ? "kit-update" : "bootstrap",
      scopeId,
      taskId: null,
    });
  } catch (error) {
    if (error instanceof WorkflowError && error.code === "NOTHING_TO_COMMIT") {
      return null;
    }
    throw error;
  }
}

/** `install <path> [--update]`: writes the Kit and commits it through a transaction. */
export function installKit(
  git: WorkflowGitFacade,
  folder: string,
  options: InstallOptions
): InstallOutcome {
  const inspected = inspectFolder(git, folder);
  const root = inspected.path;
  const update = options.update === true;
  checkPreconditions(
    inspected.state,
    update,
    inspected.nestedIn,
    inspected.transactionPending
  );
  ensure(
    inspected.git.identity,
    "GIT_IDENTITY",
    "Git has no user identity; nothing was written.",
    {},
    'Run `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.'
  );
  mkdirSync(root, { recursive: true });
  if (!inspected.git.repository) {
    git.init(root);
  }
  const hooksPath = localHooksPath(git, root);
  const before = new Set(git.changes(root).all);
  const name = options.name?.trim() || path.basename(root);
  const entries = buildPayload({
    bundle: options.bundle,
    hooksPath,
    projectName: name,
  });
  const written = [
    ...writePayload(root, entries),
    ...writeState(root, entries, options.runtime),
  ];
  const migrationRequired = inspected.state === "LEGACY_HARNESS_PLAN";
  const existingPlan = workflowPlatformFacade.readTextIfExists(
    file(root, PLAN_PATH)
  );
  const planText =
    existingPlan ??
    workflowPlanFacade.render(
      workflowPlanFacade.createEmpty(projectSlug(name), name)
    );
  if (hooksPath === null) {
    git.setConfig(root, "core.hooksPath", OWN_HOOKS_DIR);
  }
  const commit = commitInstall(
    git,
    root,
    written,
    planText,
    update,
    scopeOf(planText, migrationRequired || existingPlan === null)
  );
  return {
    commit,
    excluded: [...before].filter((item) => !written.includes(item)).sort(),
    hooksPath: hooksPath ?? OWN_HOOKS_DIR,
    migrationRequired,
    previousState: inspected.state,
    root,
    version: KIT_VERSION,
    written,
  };
}
