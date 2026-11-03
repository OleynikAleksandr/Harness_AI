import {
  ensure,
  WorkflowError,
  workflowPlatformFacade,
} from "../../workflow-platform/src/workflow-platform-facade.js";
import {
  type CheckDefinition,
  type CheckInput,
  type CommandSpec,
  type DocsContract,
  normalizeCheck,
  validateConfig,
  type WorkflowConfig,
} from "./quality-config.js";
import { detectStacks, STACK_ORDER, type StackId } from "./quality-detect.js";

/** Input of `quality:apply`: the profile chosen from a proposal. */
export interface ProfileInput {
  approval?: string;
  checks: CheckInput[];
  docs?: { contracts: DocsContract[] };
  install?: CommandSpec[];
  packageManager?: string | null;
  policy?: Partial<WorkflowConfig["policy"]>;
  stacks: string[];
}

export interface InstallResult {
  command: string;
  durationMs: number;
  output: string;
}

export interface DriftReport {
  /** Detected ecosystems that the profile does not cover. */
  added: StackId[];
  /** Profile stacks without manifests in the project. */
  missing: string[];
  status: "discovery" | "drift" | "ok";
}

const INSTALL_TIMEOUT_MS = 15 * 60 * 1000;
const MIN_APPROVAL = 10;
const OUTPUT_TAIL = 4000;

/** Builds the CONFIGURED configuration; builtin checks of `current` are kept. */
export function configuredProfile(
  current: WorkflowConfig,
  input: ProfileInput
): WorkflowConfig {
  ensure(
    input && Array.isArray(input.stacks) && input.stacks.length > 0,
    "PROFILE_INVALID",
    "The profile names at least one stack."
  );
  const unknown = input.stacks.filter(
    (id) => !STACK_ORDER.includes(id as StackId)
  );
  ensure(
    unknown.length === 0,
    "UNKNOWN_STACK",
    `Unknown stack: ${unknown.join(", ")}`
  );
  ensure(
    Array.isArray(input.checks),
    "PROFILE_INVALID",
    "The profile needs a checks list."
  );
  const builtins = current.quality.checks.filter((check) => check.builtin);
  const builtinIds = new Set(builtins.map((check) => check.id));
  const checks: CheckDefinition[] = input.checks.map((check) => {
    ensure(
      !builtinIds.has(check.id),
      "PROFILE_INVALID",
      `Check id ${check.id} is reserved for a Kit builtin.`
    );
    return normalizeCheck(check);
  });
  return validateConfig({
    ...current,
    docs: input.docs ?? current.docs,
    policy: { ...current.policy, ...(input.policy ?? {}) },
    quality: {
      checks: [...checks, ...builtins],
      packageManager: input.packageManager ?? null,
      stacks: [...new Set(input.stacks)],
      status: "CONFIGURED",
    },
  });
}

/**
 * Runs approved install commands in the project root. The first failure
 * stops the sequence; nothing is rolled back because installs change files
 * the user can inspect.
 */
export function runInstalls(
  root: string,
  input: ProfileInput,
  env: NodeJS.ProcessEnv
): InstallResult[] {
  const commands = input.install ?? [];
  if (commands.length === 0) {
    return [];
  }
  ensure(
    typeof input.approval === "string" &&
      input.approval.trim().length >= MIN_APPROVAL,
    "INSTALL_APPROVAL",
    "Installing tools changes the project; record the user's approval in `approval` (at least 10 characters)."
  );
  const results: InstallResult[] = [];
  for (const command of commands) {
    ensure(
      command &&
        typeof command.executable === "string" &&
        Array.isArray(command.args),
      "PROFILE_INVALID",
      "Each install command needs executable and args."
    );
    const started = Date.now();
    const outcome = workflowPlatformFacade.run({
      args: command.args,
      cwd: command.cwd
        ? workflowPlatformFacade.resolveInside(root, command.cwd)
        : root,
      env,
      executable: command.executable,
      timeoutMs: INSTALL_TIMEOUT_MS,
    });
    const text = [command.executable, ...command.args].join(" ");
    const output = `${outcome.stdout}${outcome.stderr}`.slice(-OUTPUT_TAIL);
    if (outcome.status !== 0) {
      throw new WorkflowError(
        "INSTALL_FAILED",
        `Install command failed: ${text}`,
        { completed: results, output: outcome.errorMessage ?? output },
        "Fix the install problem and repeat quality:apply; the profile was not changed."
      );
    }
    results.push({ command: text, durationMs: Date.now() - started, output });
  }
  return results;
}

/** Compares the profile stacks with the stacks detected in the project. */
export function profileDrift(
  root: string,
  config: WorkflowConfig
): DriftReport {
  if (config.quality.status === "DISCOVERY") {
    return { added: [], missing: [], status: "discovery" };
  }
  const detected = detectStacks(root).map((item) => item.id);
  const added = detected.filter((id) => !config.quality.stacks.includes(id));
  const missing = config.quality.stacks.filter(
    (id) => !detected.includes(id as StackId)
  );
  return {
    added,
    missing,
    status: added.length === 0 && missing.length === 0 ? "ok" : "drift",
  };
}
