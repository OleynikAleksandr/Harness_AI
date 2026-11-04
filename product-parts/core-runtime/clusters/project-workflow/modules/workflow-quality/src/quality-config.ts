import { ensure } from "../../workflow-platform/src/workflow-platform-facade.js";

export const CONFIG_PATH = ".harness/workflow/config.json";
export const CONFIG_SCHEMA = "harness-workflow-config/1";

export type QualityStatus = "CONFIGURED" | "DISCOVERY";
export type CheckStage = "commit" | "delivery" | "prepare" | "push";
export type CheckRole =
  | "architecture"
  | "audit"
  | "custom"
  | "duplication"
  | "format"
  | "installed"
  | "links"
  | "lint"
  | "package"
  | "test"
  | "typecheck";
export type BuiltinCheck =
  | "kit:conflict-markers"
  | "kit:doc-size"
  | "kit:docs-contracts"
  | "kit:file-lines"
  | "kit:md-links";

export interface CommandSpec {
  args: string[];
  cwd?: string;
  executable: string;
}

export interface CheckDefinition {
  appliesTo?: string[];
  builtin?: BuiltinCheck;
  command?: CommandSpec;
  evidence?: string;
  id: string;
  required: boolean;
  role: CheckRole;
  stage: CheckStage;
  timeoutMs: number;
}

export interface DocsContract {
  code: string;
  docs: string[];
}

export interface WorkflowConfig {
  autopilot: { maxContinues: number };
  budget: { documentBytes: number; recoveryBytes: number };
  docs: { contracts: DocsContract[] };
  /** The host that drives the project; `harness` requires scope:propose. */
  host?: string;
  policy: { maxFileLines: number | null; taskFileSoftLimit: number | null };
  quality: {
    checks: CheckDefinition[];
    packageManager: string | null;
    stacks: string[];
    status: QualityStatus;
  };
  schema: typeof CONFIG_SCHEMA;
}

const ROLES = new Set([
  "architecture",
  "audit",
  "custom",
  "duplication",
  "format",
  "installed",
  "links",
  "lint",
  "package",
  "test",
  "typecheck",
]);
const STAGES = new Set(["prepare", "commit", "push", "delivery"]);
const BUILTINS = new Set([
  "kit:conflict-markers",
  "kit:doc-size",
  "kit:docs-contracts",
  "kit:file-lines",
  "kit:md-links",
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const MAX_TIMEOUT_MS = 600_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const MIN_RECOVERY_BYTES = 8000;
const MAX_RECOVERY_BYTES = 120_000;
const error = "CONFIG_SCHEMA";

/** A builtin check definition: required, commit stage, default timeout. */
export function builtinCheck(id: BuiltinCheck): CheckDefinition {
  return {
    builtin: id,
    id,
    required: true,
    role: "custom",
    stage: "commit",
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export type CheckInput = Omit<CheckDefinition, "required" | "timeoutMs"> & {
  required?: boolean;
  timeoutMs?: number;
};

/** Fills optional check fields with their documented defaults. */
export function normalizeCheck(input: CheckInput): CheckDefinition {
  return {
    ...input,
    required: input.required ?? false,
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

export function defaultConfig(): WorkflowConfig {
  return {
    autopilot: { maxContinues: 40 },
    budget: { documentBytes: 28_000, recoveryBytes: 32_000 },
    docs: { contracts: [] },
    policy: { maxFileLines: null, taskFileSoftLimit: null },
    quality: {
      checks: [
        builtinCheck("kit:doc-size"),
        builtinCheck("kit:md-links"),
        builtinCheck("kit:file-lines"),
        builtinCheck("kit:docs-contracts"),
        builtinCheck("kit:conflict-markers"),
      ],
      packageManager: null,
      stacks: [],
      status: "DISCOVERY",
    },
    schema: CONFIG_SCHEMA,
  };
}

function positiveInteger(
  value: unknown,
  field: string,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {}
): void {
  ensure(
    Number.isSafeInteger(value) &&
      (value as number) >= min &&
      (value as number) <= max,
    error,
    `${field} must be an integer between ${min} and ${max}.`,
    { field }
  );
}

function validateCommand(check: CheckDefinition): void {
  ensure(
    Boolean(check.command) !== Boolean(check.builtin),
    error,
    `Check ${check.id} needs exactly one of command or builtin.`
  );
  if (check.builtin) {
    ensure(
      BUILTINS.has(check.builtin),
      error,
      `Unknown builtin check: ${check.builtin}`
    );
    return;
  }
  const command = check.command;
  ensure(
    command &&
      typeof command.executable === "string" &&
      command.executable.trim() !== "",
    error,
    `Check ${check.id} needs command.executable.`
  );
  ensure(
    Array.isArray(command.args) &&
      command.args.every((arg) => typeof arg === "string"),
    error,
    `Check ${check.id} needs command.args as a list of strings.`
  );
}

export function validateCheck(check: CheckDefinition): void {
  ensure(
    check && typeof check.id === "string" && ID_PATTERN.test(check.id),
    error,
    `Invalid check id: ${String(check?.id)}`
  );
  ensure(
    ROLES.has(check.role),
    error,
    `Unknown role of check ${check.id}: ${String(check.role)}`
  );
  ensure(
    STAGES.has(check.stage),
    error,
    `Unknown stage of check ${check.id}: ${String(check.stage)}`
  );
  ensure(
    typeof check.required === "boolean",
    error,
    `Check ${check.id} needs required: boolean.`
  );
  positiveInteger(check.timeoutMs, `checks.${check.id}.timeoutMs`, {
    max: MAX_TIMEOUT_MS,
  });
  validateCommand(check);
  ensure(
    check.appliesTo === undefined ||
      (Array.isArray(check.appliesTo) &&
        check.appliesTo.every(
          (glob) => typeof glob === "string" && glob !== ""
        )),
    error,
    `appliesTo of ${check.id} must be a list of globs.`
  );
  const artifact = check.role === "package" || check.role === "installed";
  ensure(
    !artifact ||
      (typeof check.evidence === "string" && check.evidence.trim() !== ""),
    error,
    `Check ${check.id} (${check.role}) needs evidence describing the artifact and scenario.`
  );
  ensure(
    check.stage !== "delivery" || artifact,
    error,
    `Only package or installed checks run at the delivery stage: ${check.id}`
  );
}

export function validateConfig(config: WorkflowConfig): WorkflowConfig {
  ensure(
    config && config.schema === CONFIG_SCHEMA,
    error,
    "Unsupported workflow configuration schema."
  );
  const quality = config.quality;
  ensure(
    quality &&
      (quality.status === "DISCOVERY" || quality.status === "CONFIGURED"),
    error,
    "quality.status must be DISCOVERY or CONFIGURED."
  );
  ensure(
    Array.isArray(quality.stacks) &&
      quality.stacks.every((stack) => typeof stack === "string"),
    error,
    "quality.stacks must be a list."
  );
  ensure(
    quality.status === "DISCOVERY" || quality.stacks.length > 0,
    error,
    "A CONFIGURED profile names at least one stack."
  );
  ensure(
    Array.isArray(quality.checks),
    error,
    "quality.checks must be a list."
  );
  for (const check of quality.checks) {
    validateCheck(check);
  }
  ensure(
    new Set(quality.checks.map((check) => check.id)).size ===
      quality.checks.length,
    error,
    "Check ids must be unique."
  );
  ensure(
    Array.isArray(config.docs?.contracts) &&
      config.docs.contracts.every(
        (item) =>
          typeof item.code === "string" &&
          Array.isArray(item.docs) &&
          item.docs.length > 0
      ),
    error,
    "docs.contracts must map code globs to documents."
  );
  ensure(
    config.policy &&
      (config.policy.maxFileLines === null ||
        Number.isSafeInteger(config.policy.maxFileLines)),
    error,
    "policy.maxFileLines must be an integer or null."
  );
  ensure(
    config.policy.taskFileSoftLimit === null ||
      Number.isSafeInteger(config.policy.taskFileSoftLimit),
    error,
    "policy.taskFileSoftLimit must be an integer or null."
  );
  positiveInteger(config.budget?.documentBytes, "budget.documentBytes");
  positiveInteger(config.budget?.recoveryBytes, "budget.recoveryBytes", {
    max: MAX_RECOVERY_BYTES,
    min: MIN_RECOVERY_BYTES,
  });
  positiveInteger(config.autopilot?.maxContinues, "autopilot.maxContinues", {
    max: 1000,
  });
  ensure(
    config.host === undefined ||
      (typeof config.host === "string" && config.host.trim() !== ""),
    error,
    "host must be a non-empty string when present."
  );
  return config;
}
