import { readFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { RoundDigest } from "../../workflow-plan/src/workflow-plan-facade.js";
import { WorkflowError } from "../../workflow-platform/src/workflow-platform-facade.js";
import type { ProfileInput } from "../../workflow-quality/src/workflow-quality-facade.js";
import type { RecoveryEvent } from "../../workflow-recovery/src/workflow-recovery-facade.js";
import {
  flag,
  integerFlag,
  listFlag,
  type ParsedArgs,
  parseArgs,
  positional,
  readJsonFile,
  requiredFlag,
} from "./kit-cli-args.js";
import { renderText } from "./kit-cli-text.js";
import {
  type CarryoverInput,
  type ExtendInput,
  type ScopeInput,
  type TaskPatch,
  WorkflowKitFacade,
} from "./workflow-kit-facade.js";

export interface CliIo {
  cwd: string;
  env: NodeJS.ProcessEnv;
  readStdin: () => string;
  stderr: (text: string) => void;
  stdout: (text: string) => void;
}

interface CommandContext {
  args: ParsedArgs;
  io: CliIo;
  kit: WorkflowKitFacade;
  root: string;
}

interface CommandSpec {
  run: (context: CommandContext) => unknown;
  usage: string;
}

const EVENTS = new Set(["startup", "resume", "clear", "compact"]);

const COMMANDS: Readonly<Record<string, CommandSpec>> = {
  accept: {
    run: ({ args, kit, root }) => kit.accept(root, requiredFlag(args, "note")),
    usage: 'accept --note "<the user\'s words>"',
  },
  carryover: {
    run: ({ args, io, kit, root }) =>
      kit.carryover(
        root,
        readJsonFile<CarryoverInput>(io.cwd, requiredFlag(args, "input"))
      ),
    usage: "carryover --input <file.json>",
  },
  close: {
    run: ({ args, kit, root }) =>
      kit.close(root, requiredFlag(args, "scope"), requiredFlag(args, "note")),
    usage: 'close --scope <id> --note "<direct user command>"',
  },
  commit: {
    run: ({ args, io, kit, root }) => {
      const digest = flag(args, "digest");
      return kit.commitTask(root, requiredFlag(args, "task"), {
        digest: digest ? readJsonFile<RoundDigest>(io.cwd, digest) : null,
        files: listFlag(args, "files"),
      });
    },
    usage: "commit --task <ID> [--files <json|a,b>] [--digest <file.json>]",
  },
  "docs:commit": {
    run: ({ args, kit, root }) => {
      const files = listFlag(args, "files");
      if (!files) {
        throw new WorkflowError("USAGE", "--files is required.");
      }
      return kit.commitDocs(root, files, flag(args, "message"));
    },
    usage: 'docs:commit --files <json|a,b> [--message "docs: ..."]',
  },
  history: {
    run: ({ args, kit, root }) =>
      kit.history(root, {
        round: flag(args, "round"),
        task: flag(args, "task"),
      }),
    usage: "history [--task <ID>] [--round <R>]",
  },
  "plan:extend": {
    run: ({ args, io, kit, root }) =>
      kit.extend(
        root,
        readJsonFile<ExtendInput>(io.cwd, requiredFlag(args, "input")),
        integerFlag(args, "expected-revision")
      ),
    usage: "plan:extend --input <file.json> [--expected-revision N]",
  },
  "quality:apply": {
    run: ({ args, io, kit, root }) =>
      kit.qualityApply(
        root,
        readJsonFile<ProfileInput>(io.cwd, requiredFlag(args, "input"))
      ),
    usage: "quality:apply --input <profile.json>",
  },
  "quality:detect": {
    run: ({ args, kit, root }) =>
      kit.qualityDetect(root, listFlag(args, "stack")),
    usage: "quality:detect [--stack node,python]",
  },
  "quality:status": {
    run: ({ kit, root }) => kit.qualityStatus(root),
    usage: "quality:status",
  },
  recover: {
    run: ({ args, kit, root }) => {
      const event = flag(args, "event") ?? "startup";
      if (!EVENTS.has(event)) {
        throw new WorkflowError(
          "USAGE",
          "--event is startup, resume, clear or compact."
        );
      }
      return kit.recover(root, event as RecoveryEvent);
    },
    usage: "recover [--event startup|resume|clear|compact]",
  },
  repair: {
    run: ({ args, kit, root }) =>
      kit.repair(root, {
        apply: flag(args, "apply"),
        cancel: flag(args, "cancel"),
      }),
    usage: "repair [--apply <repairId> | --cancel <repairId>]",
  },
  "scope:create": {
    run: ({ args, io, kit, root }) =>
      kit.createScope(
        root,
        readJsonFile<ScopeInput>(io.cwd, requiredFlag(args, "input"))
      ),
    usage: "scope:create --input <file.json>",
  },
  "show-task": {
    run: ({ args, kit, root }) => ({
      text: kit.showTask(root, positional(args, 0, "Task id")),
    }),
    usage: "show-task <ID>",
  },
  status: {
    run: ({ kit, root }) => kit.status(root),
    usage: "status",
  },
  "task:block": {
    run: ({ args, kit, root }) => kit.block(root, requiredFlag(args, "reason")),
    usage: 'task:block --reason "<text>"',
  },
  "task:start": {
    run: ({ args, kit, root }) =>
      kit.startTask(
        root,
        positional(args, 0, "Task id"),
        flag(args, "confirmed") ?? null
      ),
    usage: 'task:start <ID> [--confirmed "<user confirmation>"]',
  },
  "task:unblock": {
    run: ({ kit, root }) => kit.unblock(root),
    usage: "task:unblock",
  },
  "task:update": {
    run: ({ args, io, kit, root }) =>
      kit.updateTask(
        root,
        positional(args, 0, "Task id"),
        readJsonFile<TaskPatch>(io.cwd, requiredFlag(args, "input")),
        integerFlag(args, "expected-revision")
      ),
    usage: "task:update <ID> --input <patch.json> [--expected-revision N]",
  },
  validate: {
    run: ({ kit, root }) => kit.validate(root),
    usage: "validate",
  },
};

function helpText(): string {
  const lines = Object.entries(COMMANDS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, spec]) => `  scripts/workflow ${spec.usage}`);
  return [
    "Workflow Kit — the project development process.",
    "",
    "Usage:",
    ...lines,
    "  scripts/workflow hook session-start --client claude|codex",
    "  scripts/workflow git-hook <pre-commit|commit-msg|post-commit|pre-push> [args]",
    "",
    "Options: --format json|text (default json), --root <project>.",
    'Errors: {"ok":false,"code","message","nextAction"} and exit code 1.',
    "",
  ].join("\n");
}

function projectRoot(
  args: ParsedArgs,
  io: CliIo,
  kit: WorkflowKitFacade
): string {
  const explicit = flag(args, "root") ?? io.env.HARNESS_WORKFLOW_ROOT;
  if (explicit) {
    return explicit;
  }
  return kit.git.isRepository(io.cwd) ? kit.git.topLevel(io.cwd) : io.cwd;
}

function errorEnvelope(error: unknown): Record<string, unknown> {
  if (error instanceof WorkflowError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
      nextAction: error.nextAction ?? null,
      ok: false,
    };
  }
  return {
    code: "INTERNAL",
    message: (error as Error)?.message ?? String(error),
    nextAction: null,
    ok: false,
  };
}

function runHook(
  args: ParsedArgs,
  io: CliIo,
  kit: WorkflowKitFacade,
  root: string
): number {
  if (args.command === "hook") {
    const client = flag(args, "client");
    if (
      positional(args, 0, "Hook name") !== "session-start" ||
      (client !== "claude" && client !== "codex")
    ) {
      throw new WorkflowError(
        "USAGE",
        "hook session-start --client claude|codex"
      );
    }
    io.stdout(kit.sessionStart(root, client, io.readStdin()));
    return 0;
  }
  const result = kit.gitHook(
    root,
    positional(args, 0, "Hook name"),
    args.positionals.slice(1)
  );
  if (result.message) {
    io.stderr(`${result.message}\n`);
  }
  return result.exitCode;
}

function dispatch(
  args: ParsedArgs,
  io: CliIo,
  kit: WorkflowKitFacade,
  format: string
): number {
  const command = args.command ?? "help";
  const root = projectRoot(args, io, kit);
  if (command === "hook" || command === "git-hook") {
    return runHook(args, io, kit, root);
  }
  const spec = COMMANDS[command];
  if (!spec) {
    throw new WorkflowError(
      "UNKNOWN_COMMAND",
      `Unknown command: ${command}`,
      {},
      "Run `scripts/workflow help`."
    );
  }
  const result = spec.run({ args, io, kit, root });
  io.stdout(
    format === "text"
      ? renderText(command, result)
      : `${JSON.stringify({ command, ok: true, result }, null, 2)}\n`
  );
  return 0;
}

function writeFailure(io: CliIo, error: unknown, format: string): void {
  const envelope = errorEnvelope(error);
  if (format === "text") {
    io.stderr(
      `${envelope.code}: ${envelope.message}${envelope.nextAction ? `\nNext: ${envelope.nextAction}` : ""}\n`
    );
  } else {
    io.stdout(`${JSON.stringify(envelope, null, 2)}\n`);
  }
}

/** Runs one Kit command; returns the process exit code. */
export function runCli(
  argv: readonly string[],
  io: CliIo,
  kit?: WorkflowKitFacade
): number {
  const facade = kit ?? new WorkflowKitFacade({ env: io.env });
  let format = "json";
  try {
    const args = parseArgs(argv);
    format = flag(args, "format") ?? "json";
    const wantsHelp =
      args.command === "help" || args.flags.get("help") === true;
    if (!args.command || wantsHelp) {
      io.stdout(helpText());
      return wantsHelp ? 0 : 1;
    }
    return dispatch(args, io, facade, format);
  } catch (error) {
    writeFailure(io, error, format);
    return 1;
  }
}

function readProcessStdin(): string {
  if (process.stdin.isTTY) {
    return "";
  }
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exitCode = runCli(process.argv.slice(2), {
    cwd: process.cwd(),
    env: process.env,
    readStdin: readProcessStdin,
    stderr: (text) => process.stderr.write(text),
    stdout: (text) => process.stdout.write(text),
  });
}
