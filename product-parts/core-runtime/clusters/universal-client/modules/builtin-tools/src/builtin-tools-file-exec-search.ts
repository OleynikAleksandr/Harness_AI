// Built-in file/exec/search tool descriptors + executors (read_file, write_file,
// edit_file, apply_patch, exec_command, grep_files, glob_files). Behavior ported
// from the reference glm-native tool executors; results are returned as the
// registry's ToolExecutionResult. Contract: docs/architecture/UniversalClient.md 3.2.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ToolDescriptor } from "../../client-contract/src/client-contract-facade.js";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
} from "../../tool-registry/src/tool-registry-facade.js";
import { applyBuiltinPatch } from "./builtin-tools-patch.js";
import { runProcess, runShell } from "./builtin-tools-process.js";
import {
  clampNumber,
  outputCharsFromBudget,
  readRequiredString,
  resolveWorkspacePath,
} from "./builtin-tools-shared.js";

const descriptor = (
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: readonly string[]
): ToolDescriptor => ({
  description,
  name,
  parametersSchema: { properties, required, type: "object" },
  qualifiedName: name,
  source: "builtin",
});

export const FILE_EXEC_SEARCH_DESCRIPTORS: readonly ToolDescriptor[] = [
  descriptor(
    "read_file",
    "Read a workspace file, optionally a line range.",
    {
      limit: {
        description: "Max lines (default 2000, max 5000).",
        type: "number",
      },
      offset: { description: "1-based start line.", type: "number" },
      path: { description: "Workspace-relative file path.", type: "string" },
    },
    ["path"]
  ),
  descriptor(
    "write_file",
    "Write a file, creating parent directories.",
    {
      content: { description: "Full file content.", type: "string" },
      path: { description: "Workspace-relative file path.", type: "string" },
    },
    ["path", "content"]
  ),
  descriptor(
    "edit_file",
    "Replace an exact, unique old string with a new string in a file.",
    {
      new_string: { description: "Replacement text.", type: "string" },
      old_string: {
        description: "Exact text to replace (must be unique).",
        type: "string",
      },
      path: { description: "Workspace-relative file path.", type: "string" },
    },
    ["path", "old_string", "new_string"]
  ),
  descriptor(
    "apply_patch",
    "Apply a Codex-style *** Begin Patch envelope (add/delete/update files).",
    { patch: { description: "The patch text.", type: "string" } },
    ["patch"]
  ),
  descriptor(
    "exec_command",
    "Run a shell command in the workspace with a timeout.",
    {
      cmd: { description: "Shell command.", type: "string" },
      max_output_tokens: {
        description: "Output budget in tokens.",
        type: "number",
      },
      workdir: {
        description: "Working directory (workspace-relative).",
        type: "string",
      },
      yield_time_ms: {
        description: "Timeout in ms (default 30000).",
        type: "number",
      },
    },
    ["cmd"]
  ),
  descriptor(
    "grep_files",
    "Search file contents with ripgrep.",
    {
      include: { description: "Optional glob filter.", type: "string" },
      max_results: {
        description: "Max matches (default 100, max 500).",
        type: "number",
      },
      path: { description: "File or directory to search.", type: "string" },
      pattern: { description: "Regex pattern.", type: "string" },
    },
    ["pattern"]
  ),
  descriptor(
    "glob_files",
    "List files matching a glob with ripgrep.",
    {
      max_results: {
        description: "Max files (default 200, max 1000).",
        type: "number",
      },
      path: { description: "Directory to search.", type: "string" },
      pattern: { description: "Glob pattern.", type: "string" },
    },
    ["pattern"]
  ),
];

const ok = (output: string): ToolExecutionResult => ({ output });

const readFileTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const absolutePath = resolveWorkspacePath(args.path, ctx.workspacePath);
  const content = await readFile(absolutePath, "utf8");
  const offset = clampNumber(args.offset, 1, Number.MAX_SAFE_INTEGER, 1);
  const limit = clampNumber(args.limit, 1, 5000, 2000);
  const lines = content.split("\n");
  return ok(lines.slice(offset - 1, offset - 1 + limit).join("\n"));
};

const writeFileTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const absolutePath = resolveWorkspacePath(args.path, ctx.workspacePath);
  const content = readRequiredString(args.content, "content", {
    allowEmpty: true,
  });
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  return ok(
    `Wrote ${Buffer.byteLength(content, "utf8")} bytes to ${absolutePath}`
  );
};

const editFileTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const absolutePath = resolveWorkspacePath(args.path, ctx.workspacePath);
  const oldString = readRequiredString(args.old_string, "old_string");
  const newString = readRequiredString(args.new_string, "new_string", {
    allowEmpty: true,
  });
  const content = await readFile(absolutePath, "utf8");
  const occurrences = content.split(oldString).length - 1;
  if (occurrences === 0) {
    throw new Error("old_string not found in the file.");
  }
  if (occurrences > 1) {
    throw new Error(`old_string is not unique (${occurrences} matches).`);
  }
  await writeFile(absolutePath, content.replace(oldString, newString), "utf8");
  return ok(`Edited ${absolutePath}`);
};

const applyPatchTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const patch = readRequiredString(args.patch, "patch");
  const files = await applyBuiltinPatch(patch, ctx.workspacePath);
  return ok(`Applied patch to: ${files.join(", ")}`);
};

const execCommandTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const command = readRequiredString(args.cmd, "cmd");
  const cwd = resolveWorkspacePath(args.workdir, ctx.workspacePath, {
    allowMissing: true,
  });
  const timeoutMs = clampNumber(args.yield_time_ms, 250, 300_000, 30_000);
  const result = await runShell(
    command,
    cwd,
    timeoutMs,
    outputCharsFromBudget(args.max_output_tokens)
  );
  const parts = [result.stdout, result.stderr].filter((p) => p.length > 0);
  return {
    output: `exit=${result.exitCode ?? "null"}${result.timedOut ? " (timed out)" : ""}\n${parts.join("\n")}`,
    ...(result.ok ? {} : { isError: true }),
  };
};

const resolveSearchTarget = async (
  value: unknown,
  workspacePath: string
): Promise<{ readonly cwd: string; readonly targetPath: string }> => {
  const workspaceRoot = resolveWorkspacePath(undefined, workspacePath, {
    allowMissing: true,
  });
  const absolutePath = resolveWorkspacePath(value, workspacePath, {
    allowMissing: true,
  });
  const stats = await stat(absolutePath);
  if (stats.isDirectory()) {
    return { cwd: absolutePath, targetPath: "." };
  }
  return {
    cwd: workspaceRoot,
    targetPath: path.relative(workspaceRoot, absolutePath) || ".",
  };
};

const grepFilesTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const pattern = readRequiredString(args.pattern, "pattern");
  const target = await resolveSearchTarget(args.path, ctx.workspacePath);
  const maxResults = clampNumber(args.max_results, 1, 500, 100);
  const rgArgs = [
    "--no-config",
    "--hidden",
    "--no-messages",
    "--with-filename",
    "--line-number",
    "--column",
    "--glob",
    "!**/.git/**",
  ];
  if (typeof args.include === "string" && args.include.trim()) {
    rgArgs.push("--glob", args.include.trim());
  }
  rgArgs.push("--", pattern, target.targetPath);
  const result = await runProcess("rg", rgArgs, target.cwd, 30_000, 80_000);
  const matches = result.stdout
    .split("\n")
    .filter(Boolean)
    .slice(0, maxResults);
  return ok(matches.join("\n"));
};

const globFilesTool = async (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> => {
  const pattern = readRequiredString(args.pattern, "pattern");
  const cwd = resolveWorkspacePath(args.path, ctx.workspacePath, {
    allowMissing: true,
  });
  const maxResults = clampNumber(args.max_results, 1, 1000, 200);
  const result = await runProcess(
    "rg",
    [
      "--no-config",
      "--files",
      "--hidden",
      "--glob",
      "!**/.git/**",
      "--glob",
      pattern,
    ],
    cwd,
    30_000,
    80_000
  );
  return ok(
    result.stdout.split("\n").filter(Boolean).slice(0, maxResults).join("\n")
  );
};

const EXECUTORS: Record<
  string,
  (
    args: Record<string, unknown>,
    ctx: ToolExecutionContext
  ) => Promise<ToolExecutionResult>
> = {
  apply_patch: applyPatchTool,
  edit_file: editFileTool,
  exec_command: execCommandTool,
  glob_files: globFilesTool,
  grep_files: grepFilesTool,
  read_file: readFileTool,
  write_file: writeFileTool,
};

// Returns null when this module does not own the tool (so a sibling part can).
export const executeFileExecSearchTool = (
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> | null => {
  const executor = EXECUTORS[name];
  return executor ? executor(args, ctx) : null;
};
