import { accessSync, constants, existsSync } from "node:fs";
import path from "node:path";
import type {
  GitIdentity,
  WorkflowGitFacade,
} from "../../workflow-git/src/workflow-git-facade.js";
import {
  PLAN_PATH,
  workflowPlanFacade,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import {
  type WorkflowPlatformFacade,
  workflowPlatformFacade,
} from "../../workflow-platform/src/workflow-platform-facade.js";
import { workflowQualityFacade } from "../../workflow-quality/src/workflow-quality-facade.js";
import {
  compareVersions,
  damagedFiles,
  readManifest,
} from "./installer-inspect.js";
import {
  type InstallOptions,
  type InstallOutcome,
  installKit,
} from "./installer-install.js";
import {
  KIT_VERSION,
  MANAGED_GIT_HOOKS,
  OWN_HOOKS_DIR,
} from "./installer-payload.js";
import { extractSection } from "./installer-sections.js";

export type DoctorStatus = "fail" | "ok" | "warn";
type RuntimeProbe = Parameters<WorkflowPlatformFacade["resolveRuntime"]>[2];

export interface DoctorCheck {
  fixable: boolean;
  id: string;
  message: string;
  nextAction: string | null;
  status: DoctorStatus;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  fix: InstallOutcome | null;
  /** The global identity the fix copied into the repository config. */
  identityFix: GitIdentity | null;
  ok: boolean;
  root: string;
}

export interface DoctorOptions {
  env?: NodeJS.ProcessEnv;
  /** Safe fixes: rewrite managed files, hooks and modes (a kit-update commit). */
  fix?: Pick<InstallOptions, "bundle" | "runtime"> | null;
  probe?: RuntimeProbe;
}

const UPDATE = "Run `scripts/workflow doctor --fix` (or `install --update`).";

const check = (
  id: string,
  status: DoctorStatus,
  message: string,
  fixable = false,
  nextAction: string | null = null
): DoctorCheck => ({
  fixable,
  id,
  message,
  nextAction,
  status,
});

function file(root: string, relative: string): string {
  return path.join(root, ...relative.split("/"));
}

function manifestChecks(root: string): DoctorCheck[] {
  const manifest = readManifest(root);
  if (!manifest) {
    return [
      check(
        "manifest",
        "fail",
        "The Workflow Kit manifest is missing.",
        false,
        "Install the Kit: `scripts/workflow install`."
      ),
    ];
  }
  const checks = [
    compareVersions(manifest.version, KIT_VERSION) < 0
      ? check(
          "manifest",
          "fail",
          `Kit ${manifest.version} is older than ${KIT_VERSION}.`,
          true,
          UPDATE
        )
      : check("manifest", "ok", `Kit ${manifest.version}.`),
  ];
  const damaged = damagedFiles(root, manifest);
  checks.push(
    damaged.length === 0
      ? check(
          "managed-files",
          "ok",
          "Managed files and sections match the manifest."
        )
      : check(
          "managed-files",
          "fail",
          `Changed or missing managed parts: ${damaged.join(", ")}.`,
          true,
          UPDATE
        )
  );
  if (process.platform !== "win32") {
    const blocked = manifest.files
      .filter((item) => item.executable && existsSync(file(root, item.path)))
      .filter((item) => {
        try {
          accessSync(file(root, item.path), constants.X_OK);
          return false;
        } catch {
          return true;
        }
      })
      .map((item) => item.path);
    checks.push(
      blocked.length === 0
        ? check("executable", "ok", "Launchers and hooks are executable.")
        : check(
            "executable",
            "fail",
            `Not executable: ${blocked.join(", ")}.`,
            true,
            UPDATE
          )
    );
  }
  return checks;
}

function hooksCheck(git: WorkflowGitFacade, root: string): DoctorCheck {
  const hooksPath = git.git
    .run(root, ["config", "--local", "--get", "core.hooksPath"], {
      allowFailure: true,
    })
    .stdout.trim();
  if (hooksPath === "") {
    return check(
      "git-hooks",
      "fail",
      "core.hooksPath is not set, so Kit hooks do not run.",
      true,
      UPDATE
    );
  }
  const missing = MANAGED_GIT_HOOKS.filter((name) => {
    const text = workflowPlatformFacade.readTextIfExists(
      path.resolve(root, hooksPath, name)
    );
    return text === null || extractSection(text, "hash") === null;
  });
  return missing.length === 0
    ? check(
        "git-hooks",
        "ok",
        `Kit hooks run from ${hooksPath === OWN_HOOKS_DIR ? OWN_HOOKS_DIR : hooksPath}.`
      )
    : check(
        "git-hooks",
        "fail",
        `Hooks without the Kit section in ${hooksPath}: ${missing.join(", ")}.`,
        true,
        UPDATE
      );
}

function planChecks(git: WorkflowGitFacade, root: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  try {
    const plan = workflowPlanFacade.read(root);
    if (!plan) {
      return [
        check(
          "plan",
          "fail",
          `${PLAN_PATH} is missing.`,
          false,
          "Run `scripts/workflow install --update`."
        ),
      ];
    }
    git.resolveReferences(root, plan, PLAN_PATH);
    checks.push(
      check("plan", "ok", `Plan revision ${plan.revision} matches the history.`)
    );
  } catch (error) {
    const { code, message } = error as { code?: string; message: string };
    checks.push(
      check(
        "plan",
        "fail",
        `${code ?? "ERROR"}: ${message}`,
        false,
        "Run `scripts/workflow repair`."
      )
    );
  }
  checks.push(
    git.transactions.journal(root)
      ? check(
          "transaction",
          "fail",
          "A commit transaction is unfinished.",
          false,
          "Run `scripts/workflow repair`."
        )
      : check("transaction", "ok", "No unfinished transaction.")
  );
  return checks;
}

/** The real global identity, or null when it is missing, a placeholder or invalid. */
function realGlobalIdentity(
  git: WorkflowGitFacade,
  root: string
): GitIdentity | null {
  const global = git.readIdentity(root, "global");
  return global && git.isUsableIdentity(global) ? global : null;
}

/** Kit commits sign with the repository-local identity only. */
function identityCheck(git: WorkflowGitFacade, root: string): DoctorCheck {
  const local = git.readIdentity(root, "local");
  if (local && git.isUsableIdentity(local)) {
    return check(
      "git-identity",
      "ok",
      `${local.name} <${local.email}> (repository config).`
    );
  }
  const problem = local
    ? `The repository git identity ${local.name} <${local.email}> is a placeholder or invalid.`
    : "The repository config has no git identity.";
  const global = realGlobalIdentity(git, root);
  return global
    ? check(
        "git-identity",
        "fail",
        problem,
        true,
        `Run \`scripts/workflow doctor --fix\` to copy ${global.name} <${global.email}> from the global config.`
      )
    : check("git-identity", "fail", problem, false, git.identityFix);
}

function environmentChecks(
  git: WorkflowGitFacade,
  root: string,
  options: DoctorOptions
): DoctorCheck[] {
  const runtime = workflowPlatformFacade.resolveRuntime(
    root,
    options.env ?? process.env,
    options.probe
  );
  const drift = workflowQualityFacade.drift(root);
  return [
    runtime
      ? check(
          "runtime",
          "ok",
          `${runtime.mode} ${runtime.version} (${runtime.source}).`
        )
      : check(
          "runtime",
          "fail",
          "No Node.js 22+ runtime for the launchers.",
          false,
          "Install Node.js 22 or newer, or open the project in Harness AI."
        ),
    identityCheck(git, root),
    drift.status === "drift"
      ? check(
          "quality-drift",
          "warn",
          `Quality profile drift: new ${drift.added.join(", ") || "none"}, missing ${drift.missing.join(", ") || "none"}.`,
          false,
          "Extend the plan with a QUALITY task."
        )
      : check(
          "quality-drift",
          "ok",
          drift.status === "discovery"
            ? "Quality profile not configured yet."
            : "Quality profile matches the stacks."
        ),
  ];
}

function inspectProject(
  git: WorkflowGitFacade,
  root: string,
  options: DoctorOptions
): DoctorCheck[] {
  return [
    ...manifestChecks(root),
    hooksCheck(git, root),
    ...planChecks(git, root),
    ...environmentChecks(git, root, options),
  ];
}

/** `doctor [--fix]`: project health; `fix` repairs only fixable findings. */
export function runDoctor(
  git: WorkflowGitFacade,
  folder: string,
  options: DoctorOptions = {}
): DoctorReport {
  const root = path.resolve(folder);
  let checks = inspectProject(git, root, options);
  let fix: InstallOutcome | null = null;
  let identityFix: GitIdentity | null = null;
  if (options.fix) {
    const fixable = checks.filter(
      (item) => item.status === "fail" && item.fixable
    );
    if (fixable.some((item) => item.id === "git-identity")) {
      identityFix = realGlobalIdentity(git, root);
      if (identityFix) {
        git.writeLocalIdentity(root, identityFix);
      }
    }
    // The update commits, so it needs a real repository identity first.
    if (
      fixable.some((item) => item.id !== "git-identity") &&
      identityCheck(git, root).status === "ok"
    ) {
      fix = installKit(git, root, { ...options.fix, update: true });
    }
    if (fix || identityFix) {
      checks = inspectProject(git, root, options);
    }
  }
  return {
    checks,
    fix,
    identityFix,
    ok: checks.every((item) => item.status !== "fail"),
    root,
  };
}
