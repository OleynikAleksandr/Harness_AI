import { accessSync, chmodSync, closeSync, constants, copyFileSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/workflow-error.ts
/**
* Structured error of every Workflow Kit module. The CLI renders it as
* `{ok:false, code, message, nextAction, details}`.
*/
var WorkflowError = class extends Error {
	code;
	details;
	nextAction;
	constructor(code, message, details = {}, nextAction = null) {
		super(message);
		this.code = code;
		this.details = details;
		this.nextAction = nextAction;
	}
};
/** Throws a WorkflowError when the condition is false. */
function ensure(condition, code, message, details = {}, nextAction = null) {
	if (!condition) throw new WorkflowError(code, message, details, nextAction);
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-fs.ts
var RETRYABLE_CODES = /* @__PURE__ */ new Set([
	"EPERM",
	"EBUSY",
	"EACCES"
]);
var RENAME_ATTEMPTS = 5;
var RENAME_BASE_DELAY_MS = 20;
var DEFAULT_LOCK_STALE_MS = 600 * 1e3;
var sleepBuffer = new Int32Array(new SharedArrayBuffer(4));
var WorkflowLockError = class extends WorkflowError {
	constructor(message) {
		super("LOCKED", message, {}, "Wait for the running workflow operation to finish.");
	}
};
function sleepSync(milliseconds) {
	Atomics.wait(sleepBuffer, 0, 0, milliseconds);
}
function errorCode(error) {
	return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}
function renameWithRetry(from, to) {
	for (let attempt = 1;; attempt += 1) try {
		renameSync(from, to);
		return;
	} catch (error) {
		if (!RETRYABLE_CODES.has(errorCode(error)) || attempt >= RENAME_ATTEMPTS) throw error;
		sleepSync(RENAME_BASE_DELAY_MS * attempt);
	}
}
/** Writes through a temporary sibling and a rename so readers never see partial files. */
function atomicWriteFile(filePath, data, options = {}) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
	try {
		writeFileSync(temporary, data, options.mode === void 0 ? {} : { mode: options.mode });
		renameWithRetry(temporary, filePath);
	} finally {
		if (existsSync(temporary)) rmSync(temporary, { force: true });
	}
}
function readTextIfExists(filePath) {
	return existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
}
function processAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return errorCode(error) === "EPERM";
	}
}
function lockIsStale(lockPath, staleMs) {
	try {
		const owner = JSON.parse(readFileSync(lockPath, "utf8"));
		return Date.now() - statSync(lockPath).mtimeMs > staleMs || typeof owner.pid !== "number" || !processAlive(owner.pid);
	} catch {
		return true;
	}
}
function acquireLock(lockPath, staleMs) {
	mkdirSync(path.dirname(lockPath), { recursive: true });
	try {
		return openSync(lockPath, "wx");
	} catch (error) {
		if (errorCode(error) !== "EEXIST") throw error;
		if (!lockIsStale(lockPath, staleMs)) throw new WorkflowLockError("Another workflow operation is running.");
		rmSync(lockPath, { force: true });
		return openSync(lockPath, "wx");
	}
}
/** Runs fn while holding an exclusive lock file; stale locks are reclaimed. */
function withFileLock(lockPath, fn, options = {}) {
	const descriptor = acquireLock(lockPath, options.staleMs ?? DEFAULT_LOCK_STALE_MS);
	try {
		writeSync(descriptor, JSON.stringify({
			at: (/* @__PURE__ */ new Date()).toISOString(),
			pid: process.pid
		}));
		return fn();
	} finally {
		closeSync(descriptor);
		rmSync(lockPath, { force: true });
	}
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-launchers.ts
/** Project-relative location of the bundled Workflow Kit inside a project. */
var KIT_BUNDLE_PATH = ".harness/workflow/runtime/workflow.mjs";
var MISSING_RUNTIME_MESSAGE = "Workflow Kit needs Node.js 22+ (or open the project in Harness AI once).";
var VERSION_CHECK = "process.exit(Number(process.versions.node.split('.')[0])>=22?0:1)";
/** POSIX sh launcher (`scripts/workflow`); also used by Git for Windows hooks. */
function posixLauncher() {
	return `#!/bin/sh
# Managed by Harness Workflow Kit. Do not edit.
set -eu
root=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$(dirname "$0")/.." && pwd))
kit="$root/${KIT_BUNDLE_PATH}"
try_runtime() {
  candidate=$1
  mode=$2
  shift 2
  [ -n "$candidate" ] && [ -x "$candidate" ] || return 1
  if [ "$mode" = electron ]; then
    ELECTRON_RUN_AS_NODE=1 "$candidate" -e "${VERSION_CHECK}" >/dev/null 2>&1 || return 1
    ELECTRON_RUN_AS_NODE=1 exec "$candidate" "$kit" "$@"
  fi
  env -u ELECTRON_RUN_AS_NODE "$candidate" -e "${VERSION_CHECK}" >/dev/null 2>&1 || return 1
  exec env -u ELECTRON_RUN_AS_NODE "$candidate" "$kit" "$@"
}
if [ -n "\${HARNESS_WORKFLOW_NODE:-}" ]; then
  try_runtime "$HARNESS_WORKFLOW_NODE" node "$@" || true
fi
runtime_file="$root/.harness/workflow/local/runtime"
if [ -f "$runtime_file" ]; then
  try_runtime "$(sed -n 1p "$runtime_file")" "$(sed -n 2p "$runtime_file")" "$@" || true
fi
try_runtime "$(command -v node 2>/dev/null || true)" node "$@" || true
for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
  try_runtime "$candidate" node "$@" || true
done
echo "${MISSING_RUNTIME_MESSAGE}" >&2
exit 127
`;
}
/** PowerShell launcher (`scripts/workflow.ps1`). */
function powershellLauncher() {
	return `# Managed by Harness Workflow Kit. Do not edit.
$ErrorActionPreference = 'Stop'
$root = (& git rev-parse --show-toplevel 2>$null)
if (-not $root) { $root = Split-Path -Parent $PSScriptRoot }
$kit = Join-Path $root '${KIT_BUNDLE_PATH}'
function Test-Runtime([string]$Path, [string]$Mode) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { return $false }
  if ($Mode -eq 'electron') { $env:ELECTRON_RUN_AS_NODE = '1' } else { Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue }
  & $Path -e "${VERSION_CHECK}" 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}
$candidates = @()
if ($env:HARNESS_WORKFLOW_NODE) { $candidates += ,@($env:HARNESS_WORKFLOW_NODE, 'node') }
$runtimeFile = Join-Path $root '.harness/workflow/local/runtime'
if (Test-Path -LiteralPath $runtimeFile) {
  $lines = @(Get-Content -LiteralPath $runtimeFile)
  $mode = if ($lines.Count -gt 1) { $lines[1] } else { 'node' }
  $candidates += ,@($lines[0], $mode)
}
$onPath = Get-Command node -ErrorAction SilentlyContinue
if ($onPath) { $candidates += ,@($onPath.Source, 'node') }
$candidates += ,@((Join-Path $env:ProgramFiles 'nodejs/node.exe'), 'node')
foreach ($candidate in $candidates) {
  if (Test-Runtime $candidate[0] $candidate[1]) {
    & $candidate[0] $kit @args
    exit $LASTEXITCODE
  }
}
[Console]::Error.WriteLine('${MISSING_RUNTIME_MESSAGE}')
exit 127
`;
}
/** CMD launcher (`scripts/workflow.cmd`): delegates to the PowerShell launcher. */
function cmdLauncher() {
	return [
		"@echo off",
		"rem Managed by Harness Workflow Kit. Do not edit.",
		"powershell -NoProfile -ExecutionPolicy Bypass -File \"%~dp0workflow.ps1\" %*",
		"exit /b %ERRORLEVEL%",
		""
	].join("\r\n");
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-paths.ts
var BACKSLASH_PATTERN = /\\/gu;
var DRIVE_LETTER_PATTERN = /^[A-Za-z]:/u;
var DUPLICATE_SLASH_PATTERN = /\/{2,}/gu;
var TRAILING_SLASH_PATTERN = /\/+$/u;
var LEADING_DOT_SLASH_PATTERN = /^(?:\.\/)+/u;
var WorkflowPathError = class extends WorkflowError {
	constructor(message, offendingPath) {
		super("UNSAFE_PATH", message, { path: offendingPath });
	}
};
function currentWorkflowPlatform() {
	if (process.platform === "win32" || process.platform === "darwin") return process.platform;
	return "linux";
}
function isCaseInsensitivePlatform(platform) {
	return platform === "win32" || platform === "darwin";
}
/** Converts any OS-style path to forward slashes without resolving it. */
function toPosixPath(value) {
	return value.replace(BACKSLASH_PATTERN, "/");
}
/**
* Normalizes a project-relative path into the canonical POSIX form stored in
* plans, manifests and configuration. Rejects absolute paths, drive letters,
* parent traversal and empty segments.
*/
function normalizeRelativePath(value) {
	if (typeof value !== "string" || value.trim() === "") throw new WorkflowPathError("Path must be a non-empty string.", String(value));
	const posix = toPosixPath(value.trim()).replace(DUPLICATE_SLASH_PATTERN, "/").replace(LEADING_DOT_SLASH_PATTERN, "").replace(TRAILING_SLASH_PATTERN, "");
	if (posix.startsWith("/") || DRIVE_LETTER_PATTERN.test(posix)) throw new WorkflowPathError("Path must be relative to the project.", value);
	if (posix.split("/").some((segment) => segment === ".." || segment === "" || segment === ".")) throw new WorkflowPathError("Path must stay inside the project.", value);
	return posix;
}
/** Resolves a canonical relative path to an absolute OS path inside root. */
function resolveInside(root, relativePath) {
	const normalized = normalizeRelativePath(relativePath);
	const resolved = path.resolve(root, ...normalized.split("/"));
	const relative = path.relative(path.resolve(root), resolved);
	if (relative.startsWith("..") || path.isAbsolute(relative)) throw new WorkflowPathError("Path escapes the project root.", relativePath);
	return resolved;
}
/** Converts an absolute path inside root into the canonical relative form. */
function relativeFromRoot(root, absolutePath) {
	const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
	if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) throw new WorkflowPathError("Path is not inside the project root.", absolutePath);
	return normalizeRelativePath(relative);
}
function samePath(left, right, platform) {
	const a = toPosixPath(left).replace(TRAILING_SLASH_PATTERN, "");
	const b = toPosixPath(right).replace(TRAILING_SLASH_PATTERN, "");
	return isCaseInsensitivePlatform(platform) ? a.toLowerCase() === b.toLowerCase() : a === b;
}
/** True when the relative path equals the prefix or lies below it. */
function isWithin(relativePath, prefix) {
	const value = normalizeRelativePath(relativePath);
	const base = normalizeRelativePath(prefix);
	return value === base || value.startsWith(`${base}/`);
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-process.ts
var CMD_META_PATTERN = /([()\][%!^"`<>&|;, *?])/gu;
var QUOTE_WITH_BACKSLASHES_PATTERN = /(\\*)"/gu;
var TRAILING_BACKSLASHES_PATTERN = /(\\*)$/u;
var BATCH_EXTENSION_PATTERN = /\.(?:cmd|bat)$/iu;
var DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";
var MAX_BUFFER = 64 * 1024 * 1024;
function pathEntries(env, platform) {
	return (env.PATH ?? env.Path ?? "").split(platform === "win32" ? ";" : ":").filter(Boolean);
}
function isExecutableFile(file, platform) {
	try {
		if (!statSync(file).isFile()) return false;
		if (platform !== "win32") accessSync(file, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}
/** Finds an executable on PATH (with PATHEXT on Windows); returns null when missing. */
function resolveExecutable(name, env, platform) {
	const hasDirectory = name.includes("/") || name.includes("\\");
	const extensions = platform === "win32" && path.extname(name) === "" ? (env.PATHEXT ?? DEFAULT_PATHEXT).toLowerCase().split(";").filter(Boolean) : [""];
	const directories = hasDirectory ? [""] : pathEntries(env, platform);
	for (const directory of directories) for (const extension of extensions) {
		const candidate = directory === "" ? `${name}${extension}` : path.join(directory, `${name}${extension}`);
		if (isExecutableFile(candidate, platform)) return candidate;
	}
	return null;
}
function escapeCmdArgument(value) {
	return `"${value.replace(QUOTE_WITH_BACKSLASHES_PATTERN, "$1$1\\\"").replace(TRAILING_BACKSLASHES_PATTERN, "$1$1")}"`.replace(CMD_META_PATTERN, "^$1").replace(CMD_META_PATTERN, "^$1");
}
/**
* Builds the spawn invocation. POSIX and Windows `.exe` run directly without a
* shell; Windows `.cmd`/`.bat` shims run through `cmd.exe /d /s /c` with
* escaped arguments.
*/
function buildInvocation(resolvedExecutable, args, platform) {
	if (platform !== "win32" || !BATCH_EXTENSION_PATTERN.test(resolvedExecutable)) return {
		args: [...args],
		file: resolvedExecutable,
		windowsVerbatimArguments: false
	};
	return {
		args: [
			"/d",
			"/s",
			"/c",
			`"${[resolvedExecutable.replace(CMD_META_PATTERN, "^$1"), ...args.map(escapeCmdArgument)].join(" ")}"`
		],
		file: "cmd.exe",
		windowsVerbatimArguments: true
	};
}
function prepare(request, platform) {
	const env = request.env ?? process.env;
	const resolved = resolveExecutable(request.executable, env, platform) ?? (existsSync(request.executable) ? request.executable : null);
	return {
		env,
		invocation: resolved ? buildInvocation(resolved, request.args, platform) : null
	};
}
function missing(executable) {
	return {
		errorMessage: `Executable not found: ${executable}`,
		status: null,
		stderr: "",
		stdout: "",
		timedOut: false
	};
}
function toResult(result) {
	const timedOut = result.error?.code === "ETIMEDOUT";
	return {
		errorMessage: result.error ? result.error.message : null,
		status: result.status,
		stderr: result.stderr ?? "",
		stdout: result.stdout ?? "",
		timedOut
	};
}
/** Runs a process synchronously without a shell. */
function runProcessSync(request, platform) {
	const { env, invocation } = prepare(request, platform);
	if (!invocation) return missing(request.executable);
	return toResult(spawnSync(invocation.file, invocation.args, {
		cwd: request.cwd,
		encoding: "utf8",
		env,
		input: request.input,
		maxBuffer: MAX_BUFFER,
		timeout: request.timeoutMs,
		windowsHide: true,
		windowsVerbatimArguments: invocation.windowsVerbatimArguments
	}));
}
/** Runs a process asynchronously without a shell; used by Core so its event loop never blocks. */
function runProcessAsync(request, platform) {
	const { env, invocation } = prepare(request, platform);
	if (!invocation) return Promise.resolve(missing(request.executable));
	return new Promise((resolve) => {
		const child = spawn(invocation.file, invocation.args, {
			cwd: request.cwd,
			env,
			timeout: request.timeoutMs,
			windowsHide: true,
			windowsVerbatimArguments: invocation.windowsVerbatimArguments
		});
		let stdout = "";
		let stderr = "";
		let errorMessage = null;
		child.stdout.setEncoding("utf8").on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.setEncoding("utf8").on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", (error) => {
			errorMessage = error.message;
		});
		child.on("close", (status, signal) => {
			resolve({
				errorMessage,
				status,
				stderr,
				stdout,
				timedOut: signal === "SIGTERM" && status === null
			});
		});
		child.stdin.end(request.input ?? "");
	});
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/platform-runtime.ts
var MINIMUM_NODE_MAJOR = 22;
/** Project-relative file where Harness records the runtime it can lend to launchers. */
var RUNTIME_FILE = ".harness/workflow/local/runtime";
var VERSION_SCRIPT = "process.stdout.write(process.versions.node)";
var LINE_SPLIT_PATTERN = /\r?\n/u;
var OS_NODE_PATHS = {
	darwin: ["/opt/homebrew/bin/node", "/usr/local/bin/node"],
	linux: ["/usr/local/bin/node", "/usr/bin/node"],
	win32: ["C:/Program Files/nodejs/node.exe"]
};
function runtimeEnvironment(mode, base) {
	const { ELECTRON_RUN_AS_NODE: _removed, ...rest } = base;
	return mode === "electron" ? {
		...rest,
		ELECTRON_RUN_AS_NODE: "1"
	} : rest;
}
function formatRuntimeFile(executable, mode) {
	return `${executable.replaceAll("\\", "/")}\n${mode}\n`;
}
function parseRuntimeFile(text) {
	const [executable, mode] = text.split(LINE_SPLIT_PATTERN).map((line) => line.trim());
	if (!executable) return null;
	return {
		executable,
		mode: mode === "electron" ? "electron" : "node"
	};
}
function runtimeCandidates(projectRoot, env, platform) {
	const candidates = [];
	if (env.HARNESS_WORKFLOW_NODE) candidates.push({
		executable: env.HARNESS_WORKFLOW_NODE,
		mode: "node",
		source: "env"
	});
	const recorded = projectRoot ? readTextIfExists(path.join(projectRoot, ...RUNTIME_FILE.split("/"))) : null;
	const parsed = recorded ? parseRuntimeFile(recorded) : null;
	if (parsed) candidates.push({
		...parsed,
		source: "runtime-file"
	});
	const onPath = resolveExecutable("node", env, platform);
	if (onPath) candidates.push({
		executable: onPath,
		mode: "node",
		source: "path"
	});
	for (const executable of OS_NODE_PATHS[platform]) candidates.push({
		executable,
		mode: "node",
		source: "os"
	});
	return candidates;
}
function probeRuntimeVersion(candidate, platform) {
	const result = runProcessSync({
		args: ["-e", VERSION_SCRIPT],
		env: runtimeEnvironment(candidate.mode, process.env),
		executable: candidate.executable,
		timeoutMs: 15e3
	}, platform);
	return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}
function satisfiesMinimum(version) {
	return Number(version.split(".")[0]) >= MINIMUM_NODE_MAJOR;
}
/** Returns the first candidate whose Node major version is at least 22. */
function resolveRuntime(candidates, probe) {
	for (const candidate of candidates) {
		const version = probe(candidate);
		if (version && satisfiesMinimum(version)) return {
			...candidate,
			version
		};
	}
	return null;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/src/workflow-platform-facade.ts
/**
* Public boundary of the workflow-platform module: OS-neutral paths, atomic
* files and locks. Every other project-workflow module reaches the
* filesystem and processes through this facade.
*/
var WorkflowPlatformFacade = class {
	platform;
	constructor(platform = currentWorkflowPlatform()) {
		this.platform = platform;
	}
	toPosix(value) {
		return toPosixPath(value);
	}
	normalizeRelative(value) {
		return normalizeRelativePath(value);
	}
	resolveInside(root, relativePath) {
		return resolveInside(root, relativePath);
	}
	relativeFromRoot(root, absolutePath) {
		return relativeFromRoot(root, absolutePath);
	}
	samePath(left, right) {
		return samePath(left, right, this.platform);
	}
	isWithin(relativePath, prefix) {
		return isWithin(relativePath, prefix);
	}
	writeFileAtomic(filePath, data, options) {
		atomicWriteFile(filePath, data, options);
	}
	readTextIfExists(filePath) {
		return readTextIfExists(filePath);
	}
	withLock(lockPath, fn, options) {
		return withFileLock(lockPath, fn, options);
	}
	findExecutable(name, env = process.env) {
		return resolveExecutable(name, env, this.platform);
	}
	/** Exposes the spawn plan (file, args, verbatim flag) for diagnostics and tests. */
	describeInvocation(resolvedExecutable, args) {
		return buildInvocation(resolvedExecutable, args, this.platform);
	}
	run(request) {
		return runProcessSync(request, this.platform);
	}
	runAsync(request) {
		return runProcessAsync(request, this.platform);
	}
	/** Resolves a Node 22+ runtime for a project; `probe` is injectable for tests. */
	resolveRuntime(projectRoot, env = process.env, probe) {
		const check = probe ?? ((candidate) => probeRuntimeVersion(candidate, this.platform));
		return resolveRuntime(runtimeCandidates(projectRoot, env, this.platform), check);
	}
	runtimeEnvironment(mode, base = process.env) {
		return runtimeEnvironment(mode, base);
	}
	formatRuntimeFile(executable, mode) {
		return formatRuntimeFile(executable, mode);
	}
	parseRuntimeFile(text) {
		return parseRuntimeFile(text);
	}
	launchers() {
		return {
			cmd: cmdLauncher(),
			posix: posixLauncher(),
			powershell: powershellLauncher()
		};
	}
};
var workflowPlatformFacade = new WorkflowPlatformFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts
var BOOLEAN_FLAGS = /* @__PURE__ */ new Set([
	"help",
	"fix",
	"dry-run",
	"update"
]);
/** Splits `command positional… --flag value --flag=value --bool`. */
function parseArgs(argv) {
	const flags = /* @__PURE__ */ new Map();
	const positionals = [];
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index] ?? "";
		if (arg === "--") {
			positionals.push(...argv.slice(index + 1));
			break;
		}
		if (arg === "-h") flags.set("help", true);
		else if (arg.startsWith("--")) {
			const body = arg.slice(2);
			const equals = body.indexOf("=");
			if (equals !== -1) flags.set(body.slice(0, equals), body.slice(equals + 1));
			else if (BOOLEAN_FLAGS.has(body)) flags.set(body, true);
			else {
				const value = argv[index + 1];
				ensure(value !== void 0 && !value.startsWith("--"), "USAGE", `--${body} needs a value.`);
				flags.set(body, value);
				index += 1;
			}
		} else positionals.push(arg);
	}
	const [command = null, ...rest] = positionals;
	return {
		command,
		flags,
		positionals: rest
	};
}
function flag(args, name) {
	const value = args.flags.get(name);
	return typeof value === "string" ? value : void 0;
}
function requiredFlag(args, name) {
	const value = flag(args, name);
	ensure(value !== void 0 && value.trim() !== "", "USAGE", `--${name} is required.`);
	return value;
}
function positional(args, index, label) {
	const value = args.positionals[index];
	ensure(value !== void 0 && value !== "", "USAGE", `${label} is required.`);
	return value;
}
function integerFlag(args, name) {
	const value = flag(args, name);
	if (value === void 0) return;
	const parsed = Number(value);
	ensure(Number.isSafeInteger(parsed), "USAGE", `--${name} must be an integer.`);
	return parsed;
}
/** Reads a JSON input file relative to the working directory. */
function readJsonFile(cwd, file) {
	let text;
	try {
		text = readFileSync(path.resolve(cwd, file), "utf8");
	} catch (cause) {
		throw new WorkflowError("INPUT_UNREADABLE", `Cannot read ${file}: ${cause.message}`);
	}
	try {
		return JSON.parse(text);
	} catch (cause) {
		throw new WorkflowError("INPUT_JSON", `${file} is not valid JSON: ${cause.message}`);
	}
}
/** `--files` as a JSON array or a comma-separated list. */
function listFlag(args, name) {
	const value = flag(args, name);
	if (value === void 0) return;
	if (value.trim().startsWith("[")) try {
		const parsed = JSON.parse(value);
		ensure(Array.isArray(parsed) && parsed.every((item) => typeof item === "string"), "USAGE", `--${name} must list strings.`);
		return parsed;
	} catch (cause) {
		if (cause instanceof WorkflowError) throw cause;
		throw new WorkflowError("USAGE", `--${name} is not a valid JSON list.`);
	}
	return value.split(",").map((item) => item.trim()).filter(Boolean);
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-text.ts
function statusText(status) {
	const lines = [`project: ${status.project ? `${status.project.name} (${status.project.id})` : "not installed"}`, status.scope ? `scope: ${status.scope.id} ${status.scope.status}, result ${status.scope.delivery}, revision ${status.revision}` : `scope: NONE, revision ${status.revision}`];
	if (status.scope?.blockedReason) lines.push(`blocked: ${status.scope.blockedReason}`);
	lines.push(`progress: ${status.progress.done}/${status.progress.total}`, `current: ${status.currentTask ? `${status.currentTask.id} ${status.currentTask.title}` : "none"}`, `next: ${status.nextTask ? `${status.nextTask.id} [${status.nextTask.kind}] ${status.nextTask.title}` : "none"}`, `quality: ${status.quality.status}${status.quality.stacks.length > 0 ? ` (${status.quality.stacks.join(", ")})` : ""}, drift ${status.quality.drift.status}`, `head: ${status.head ? status.head.slice(0, 8) : "none"}`, `transaction: ${status.transaction ? `${status.transaction.id} ${status.transaction.phase}` : "none"}`, `changes: ${status.changes.length === 0 ? "none" : status.changes.join(", ")}`);
	return `${lines.join("\n")}\n`;
}
function validationText(report) {
	return report.ok ? "Plan and history are consistent.\n" : `${report.errors.map((error) => `${error.code}: ${error.message}`).join("\n")}\n`;
}
/** Human-readable output of `--format text`. */
function renderText(command, result) {
	const value = result;
	switch (command) {
		case "status": return statusText(result);
		case "validate": return validationText(result);
		case "recover":
		case "history":
		case "show-task": return String(value.text ?? "");
		default: return `${JSON.stringify(result, null, 2)}\n`;
	}
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-history.ts
var RECORD_SEPARATOR = "";
var FIELD_SEPARATOR = "\0";
var TRAILER_PATTERN = /^(Workflow-[A-Za-z-]+):\s*(.+)$/u;
var STATUS_PREFIX_LENGTH = 3;
var LEADING_NEWLINE_PATTERN = /^\n/u;
/** Parses `git status --porcelain=v1 -z` including rename/copy pairs. */
function parsePorcelain(output) {
	const entries = output.split(FIELD_SEPARATOR).filter(Boolean);
	const changes = {
		all: [],
		staged: [],
		unstaged: [],
		untracked: []
	};
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index] ?? "";
		const indexState = entry[0] ?? " ";
		const treeState = entry[1] ?? " ";
		const file = entry.slice(STATUS_PREFIX_LENGTH);
		if (indexState === "R" || indexState === "C") {
			const source = entries[index + 1];
			index += 1;
			if (source) changes.staged.push(source);
		}
		if (indexState === "?") {
			changes.untracked.push(file);
			continue;
		}
		if (indexState !== " ") changes.staged.push(file);
		if (treeState !== " ") changes.unstaged.push(file);
	}
	const unique = (values) => [...new Set(values)].sort();
	return {
		all: unique([
			...changes.staged,
			...changes.unstaged,
			...changes.untracked
		]),
		staged: unique(changes.staged),
		unstaged: unique(changes.unstaged),
		untracked: unique(changes.untracked)
	};
}
function parseTrailers(message) {
	const trailers = {};
	const paragraphs = message.trim().split("\n\n");
	const last = paragraphs.length > 1 ? paragraphs.at(-1) ?? "" : "";
	for (const line of last.split("\n")) {
		const match = TRAILER_PATTERN.exec(line.trim());
		if (match?.[1] && match[2]) trailers[match[1]] = [...trailers[match[1]] ?? [], match[2].trim()];
	}
	return trailers;
}
function readChanges(git, root) {
	return parsePorcelain(git.run(root, [
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all"
	]).stdout);
}
/** Commits reachable from `tip` but not from `from` (all when from is null), oldest first. */
function readHistory(git, root, from, tip = "HEAD") {
	const range = from ? `${from}..${tip}` : tip;
	const output = git.run(root, [
		"log",
		"--reverse",
		`--format=%H%x00%P%x00%B${RECORD_SEPARATOR}`,
		range
	], { allowFailure: true });
	if (output.status !== 0) return [];
	return output.stdout.split(RECORD_SEPARATOR).map((record) => record.replace(LEADING_NEWLINE_PATTERN, "")).filter((record) => record.trim() !== "").map((record) => {
		const [sha = "", parents = "", message = ""] = record.split(FIELD_SEPARATOR);
		return {
			message: message.trim(),
			parents: parents.split(" ").filter(Boolean),
			sha,
			subject: message.split("\n")[0]?.trim() ?? "",
			trailers: parseTrailers(message)
		};
	});
}
function readCommitPaths(git, root, sha) {
	return git.run(root, [
		"diff-tree",
		"--no-commit-id",
		"--name-only",
		"-r",
		"-z",
		"--root",
		sha
	]).stdout.split(FIELD_SEPARATOR).filter(Boolean).sort();
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-journal.ts
/** Project-relative directory for local, git-ignored Workflow Kit state. */
var LOCAL_DIR = ".harness/workflow/local";
function sha256$1(value) {
	return createHash("sha256").update(value).digest("hex");
}
function localPath(root, ...parts) {
	return path.join(root, ...LOCAL_DIR.split("/"), ...parts);
}
function readJournal(root) {
	const file = localPath(root, "transaction.json");
	return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
function saveJournal(root, journal) {
	workflowPlatformFacade.writeFileAtomic(localPath(root, "transaction.json"), `${JSON.stringify(journal, null, 2)}\n`);
}
function removeJournal(root) {
	rmSync(localPath(root, "transaction.json"), { force: true });
	rmSync(localPath(root, "index-before"), { force: true });
}
/** Full commit message: subject/body followed by the Workflow trailers. */
function commitMessageFor(journal) {
	const trailers = [
		`Workflow-Scope: ${journal.scopeId ?? "NONE"}`,
		`Workflow-Task: ${journal.taskId ?? "-"}`,
		`Workflow-Role: ${journal.role}`,
		...journal.taskId === null ? [] : [`Workflow-Iteration: ${journal.iteration}`],
		`Workflow-Transaction: ${journal.id}`
	];
	return `${journal.message.trim()}\n\n${trailers.join("\n")}\n`;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-references.ts
function trailer(commit, key) {
	const values = commit.trailers[key] ?? [];
	ensure(values.length <= 1, "AMBIGUOUS_COMMIT", `Duplicated ${key} trailer in ${commit.sha}.`);
	return values[0];
}
/** Roles of commits that complete a plan task. */
var TASK_ROLES = /* @__PURE__ */ new Set([
	"docs",
	"implementation",
	"quality"
]);
function taskCommits$1(history, scopeId, task) {
	return history.filter((commit) => trailer(commit, "Workflow-Scope") === scopeId && trailer(commit, "Workflow-Task") === task.id && TASK_ROLES.has(trailer(commit, "Workflow-Role") ?? "") && Number(trailer(commit, "Workflow-Iteration") ?? "1") === task.iteration);
}
function checkCommit(git, root, plan, planPath, task, commit, resolved) {
	ensure(task.status === "DONE", "PLAN_COMMIT_MISMATCH", `Task ${task.id} has a commit but is not DONE.`, { sha: commit.sha });
	ensure(commit.parents.length === 1, "HISTORY_NOT_LINEAR", `The task commit of ${task.id} must have one parent.`, { sha: commit.sha });
	const paths = readCommitPaths(git, root, commit.sha);
	const allowed = /* @__PURE__ */ new Set([...task.files, planPath]);
	const outside = paths.filter((file) => !allowed.has(file));
	ensure(outside.length === 0, "COMMIT_SCOPE_MISMATCH", `The commit of ${task.id} touches files outside the task.`, {
		paths: outside,
		sha: commit.sha
	});
	for (const dependency of task.dependencies) {
		const dependencySha = resolved.get(dependency);
		ensure(plan.tasks.find((item) => item.id === dependency && plan.rounds.find((round) => round.id === item.roundId)?.kind === "legacy") || dependencySha && git.succeeds(root, [
			"merge-base",
			"--is-ancestor",
			dependencySha,
			commit.parents[0] ?? ""
		]), "DEPENDENCY_ORDER", `Dependency ${dependency} must be committed before ${task.id}.`);
	}
	return paths;
}
/**
* Proves that every DONE task has exactly one commit in baseline..HEAD that
* touches only its files, after the commits of its dependencies.
*/
function resolveTaskReferences(git, root, plan, planPath, pending) {
	const references = /* @__PURE__ */ new Map();
	const scope = plan.scope;
	if (!scope) return references;
	const history = readHistory(git, root, scope.baselineCommit);
	const legacyRounds = new Set(plan.rounds.filter((round) => round.kind === "legacy").map((round) => round.id));
	const resolved = /* @__PURE__ */ new Map();
	for (const task of plan.tasks.filter((item) => !legacyRounds.has(item.roundId))) {
		const commits = taskCommits$1(history, scope.id, task);
		ensure(commits.length <= 1, "AMBIGUOUS_COMMIT", `Several commits claim task ${task.id}.`, { shas: commits.map((commit) => commit.sha) });
		const [commit] = commits;
		if (commit) {
			const paths = checkCommit(git, root, plan, planPath, task, commit, resolved);
			resolved.set(task.id, commit.sha);
			references.set(task.id, {
				paths,
				sha: commit.sha,
				status: "committed"
			});
			continue;
		}
		const inTransaction = pending?.scopeId === scope.id && pending.taskId === task.id;
		ensure(task.status !== "DONE" || inTransaction, "PLAN_COMMIT_MISMATCH", `Task ${task.id} is DONE but has no commit.`, {}, "Run `scripts/workflow repair`.");
		references.set(task.id, { status: inTransaction ? "pending" : "open" });
	}
	return references;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-model.ts
var PLAN_SCHEMA = "harness-workflow-plan/1";
var PLAN_PATH = ".harness/plans/todo-plan.md";
var DOCS_TASK_PREFIX = "DOCS-";
var MARKDOWN_PATTERN = /\.(?:md|markdown)$/iu;
function isDocumentationPath(file) {
	return MARKDOWN_PATTERN.test(file);
}
function functionalFiles(task) {
	return task.files.filter((file) => !isDocumentationPath(file));
}
function docsTaskId(roundId) {
	return `${DOCS_TASK_PREFIX}${roundId}`;
}
function emptyPlan(projectId, projectName) {
	return {
		currentTaskId: null,
		lastClosed: null,
		projectId,
		projectName,
		revision: 1,
		rounds: [],
		schema: PLAN_SCHEMA,
		scope: null,
		tasks: []
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-validation.ts
var ID_PATTERN$1 = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
var ROUND_ID_PATTERN = /^R[0-9]+(?:-[a-z]+)?$/u;
var SHA_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
var LINE_BREAK_PATTERN = /[\r\n]/u;
var TASK_STATUSES = /* @__PURE__ */ new Set([
	"TODO",
	"IN_PROGRESS",
	"DONE"
]);
var TASK_KINDS = /* @__PURE__ */ new Set([
	"work",
	"quality",
	"docs",
	"delivery"
]);
var ROUND_KINDS = /* @__PURE__ */ new Set([
	"implementation",
	"fixes",
	"legacy"
]);
var DELIVERY_STATES = /* @__PURE__ */ new Set([
	"IN_PROGRESS",
	"READY_FOR_ACCEPTANCE",
	"ACCEPTED"
]);
var schemaError = "PLAN_SCHEMA";
function text(value, field) {
	ensure(typeof value === "string" && value.trim() !== "", schemaError, `Field must be a non-empty string: ${field}`, { field });
}
function textList(value, field, { nonEmpty = false } = {}) {
	ensure(Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== ""), schemaError, `Field must be a list of non-empty strings: ${field}`, { field });
	ensure(!nonEmpty || value.length > 0, schemaError, `List must not be empty: ${field}`, { field });
	ensure(new Set(value).size === value.length, schemaError, `List has duplicates: ${field}`, { field });
}
function identifier(value, field) {
	ensure(typeof value === "string" && ID_PATTERN$1.test(value), schemaError, `Invalid identifier in ${field}: ${String(value)}`, { field });
}
function decision$1(value, field) {
	ensure(value && typeof value === "object", schemaError, `Missing decision: ${field}`, { field });
	text(value.text, `${field}.text`);
	text(value.at, `${field}.at`);
}
function relativePaths(values, field) {
	textList(values, field);
	for (const value of values) ensure(workflowPlatformFacade.normalizeRelative(value) === value, schemaError, `Path is not canonical in ${field}: ${value}`, {
		field,
		path: value
	});
}
function documents(values, field) {
	ensure(Array.isArray(values), schemaError, `Field must be a list: ${field}`, { field });
	relativePaths(values.map((doc) => doc.path), `${field}.path`);
	for (const doc of values) {
		ensure(typeof doc.required === "boolean", schemaError, `required must be boolean in ${field}`, { field });
		ensure(doc.heading === void 0 || typeof doc.heading === "string" && doc.heading.trim() !== "", schemaError, `heading must be text in ${field}`, { field });
	}
}
function byteLength$1(value) {
	return new TextEncoder().encode(value).length;
}
/** Validates the round digest written by a DOCS task. */
function validateDigest(digest, field = "digest") {
	ensure(digest && typeof digest === "object", "ROUND_DIGEST_REQUIRED", "A round digest with at least `result` is required.", { field });
	text(digest.result, `${field}.result`);
	ensure(byteLength$1(digest.result) <= 600, "ROUND_DIGEST_TOO_LARGE", `Digest result exceeds 600 bytes.`, { field });
	for (const key of [
		"decisions",
		"contracts",
		"references"
	]) {
		const items = digest[key];
		textList(items, `${field}.${key}`);
		ensure(items.length <= 8, "ROUND_DIGEST_TOO_LARGE", `Digest ${key} has more than 8 items.`, { field });
		ensure(items.every((item) => byteLength$1(item) <= 300), "ROUND_DIGEST_TOO_LARGE", `Digest ${key} item exceeds 300 bytes.`, { field });
	}
}
function validateScope(scope) {
	identifier(scope.id, "scope.id");
	text(scope.objective, "scope.objective");
	textList(scope.acceptance, "scope.acceptance", { nonEmpty: true });
	decision$1(scope.approval, "scope.approval");
	ensure(Array.isArray(scope.decisions), schemaError, "scope.decisions must be a list.");
	for (const [index, item] of scope.decisions.entries()) decision$1(item, `scope.decisions[${index}]`);
	ensure(SHA_PATTERN.test(scope.baselineCommit), schemaError, "scope.baselineCommit must be a full commit SHA.");
	ensure(scope.spec === null || workflowPlatformFacade.normalizeRelative(scope.spec) === scope.spec, schemaError, "scope.spec must be a canonical path or null.");
	documents(scope.context, "scope.context");
	ensure(scope.status === "ACTIVE" || scope.status === "BLOCKED", schemaError, "scope.status must be ACTIVE or BLOCKED.");
	ensure(scope.status === "BLOCKED" === (typeof scope.blockedReason === "string" && scope.blockedReason.trim() !== ""), schemaError, "A BLOCKED scope needs blockedReason; an ACTIVE scope has none.");
	ensure(DELIVERY_STATES.has(scope.delivery), schemaError, "Unknown scope.delivery state.");
	ensure(scope.delivery === "ACCEPTED" === (scope.acceptanceNote !== null), schemaError, "acceptanceNote is present exactly when the scope is ACCEPTED.");
	if (scope.acceptanceNote) decision$1(scope.acceptanceNote, "scope.acceptanceNote");
}
function roundDocsDone(plan, roundId) {
	return plan.tasks.some((task) => task.roundId === roundId && task.kind === "docs" && task.status === "DONE");
}
function validateRounds(plan) {
	const rounds = plan.rounds;
	ensure(rounds.length > 0, schemaError, "An active scope needs at least one round.");
	ensure(new Set(rounds.map((round) => round.id)).size === rounds.length, schemaError, "Round ids must be unique.");
	rounds.forEach((round, index) => {
		ensure(ROUND_ID_PATTERN.test(round.id), schemaError, `Invalid round id: ${round.id}`);
		ensure(ROUND_KINDS.has(round.kind), schemaError, `Invalid round kind: ${round.id}`);
		text(round.title, `rounds.${round.id}.title`);
		ensure(round.status === "OPEN" || round.status === "CLOSED", schemaError, `Invalid round status: ${round.id}`);
		ensure(round.status === "CLOSED" || index === rounds.length - 1, schemaError, "Only the last round may be OPEN.");
		if (round.status === "CLOSED" || roundDocsDone(plan, round.id)) validateDigest(round.digest, `rounds.${round.id}.digest`);
		else ensure(round.digest === null, schemaError, `A round gets its digest with its DOCS task: ${round.id}`);
	});
}
function validateTaskFields(task) {
	identifier(task.id, "task.id");
	text(task.title, `tasks.${task.id}.title`);
	text(task.why, `tasks.${task.id}.why`);
	text(task.commitMessage, `tasks.${task.id}.commitMessage`);
	ensure(!LINE_BREAK_PATTERN.test(task.commitMessage), schemaError, `commitMessage must be one line: ${task.id}`);
	ensure(TASK_KINDS.has(task.kind), schemaError, `Invalid task kind: ${task.id}`);
	ensure(TASK_STATUSES.has(task.status), schemaError, `Invalid task status: ${task.id}`);
	ensure(Number.isSafeInteger(task.iteration) && task.iteration >= 1, schemaError, `iteration must be a positive integer: ${task.id}`);
	relativePaths(task.files, `tasks.${task.id}.files`);
	textList(task.dependencies, `tasks.${task.id}.dependencies`);
	textList(task.acceptance, `tasks.${task.id}.acceptance`, { nonEmpty: true });
	textList(task.checks, `tasks.${task.id}.checks`);
	documents(task.context, `tasks.${task.id}.context`);
	ensure(task.docsWaiver === null || typeof task.docsWaiver === "string", schemaError, `docsWaiver must be text or null: ${task.id}`);
	ensure(task.confirmation === null || task.kind === "delivery", schemaError, `Only delivery tasks carry a confirmation: ${task.id}`);
}
function validateTaskGraph(plan) {
	const positions = new Map(plan.tasks.map((task, index) => [task.id, index]));
	ensure(positions.size === plan.tasks.length, schemaError, "Task ids must be unique.");
	const rounds = new Map(plan.rounds.map((round) => [round.id, round]));
	plan.tasks.forEach((task, index) => {
		const round = rounds.get(task.roundId);
		ensure(round, schemaError, `Task references an unknown round: ${task.id}`);
		ensure(round.status === "OPEN" || task.status === "DONE", schemaError, `Tasks of a closed round are DONE: ${task.id}`);
		for (const dependency of task.dependencies) {
			const position = positions.get(dependency);
			ensure(position !== void 0 && position < index, "TASK_ORDER", `Dependency must exist and come earlier: ${task.id} -> ${dependency}`);
		}
		if (task.fixes !== null) {
			const fixed = positions.get(task.fixes);
			ensure(fixed !== void 0 && fixed < index, schemaError, `fixes must reference an earlier task: ${task.id}`);
		}
	});
}
function validateServiceTasks(plan) {
	for (const round of plan.rounds.filter((item) => item.kind !== "legacy")) {
		const roundTasks = plan.tasks.filter((task) => task.roundId === round.id);
		const docs = roundTasks.filter((task) => task.kind === "docs");
		ensure(docs.length <= 1, "DOCS_TASK", `A round has at most one DOCS task: ${round.id}`);
		const docsTask = docs[0];
		ensure(!docsTask || docsTask.id === docsTaskId(round.id), "DOCS_TASK", `DOCS task id must be ${docsTaskId(round.id)}.`);
		ensure(!docsTask || functionalFiles(docsTask).length === 0, "DOCS_TASK", `DOCS task holds documentation only: ${round.id}`);
		const docsIndex = docsTask ? roundTasks.indexOf(docsTask) : roundTasks.length;
		roundTasks.forEach((task, index) => {
			const regular = task.kind === "work" || task.kind === "quality";
			ensure(!(regular && docsTask && index > docsIndex), "DOCS_TASK", `Only delivery tasks follow DOCS: ${task.id}`);
			ensure(!(regular && docsTask) || docsTask.dependencies.includes(task.id), "DOCS_TASK", `DOCS depends on every task of its round: ${task.id}`);
			ensure(task.kind !== "delivery" || docsTask !== void 0 && task.dependencies.includes(docsTask.id), "DELIVERY_ORDER", `Delivery tasks depend on their round DOCS: ${task.id}`);
		});
	}
}
function validateProgress(plan, scope) {
	const running = plan.tasks.filter((task) => task.status === "IN_PROGRESS");
	ensure(running.length <= 1 && (running[0]?.id ?? null) === plan.currentTaskId, schemaError, "currentTaskId must match the only IN_PROGRESS task.");
	ensure((plan.tasks.length > 0 && plan.tasks.every((task) => task.status === "DONE")) === (scope.delivery !== "IN_PROGRESS"), schemaError, "Delivery state must be IN_PROGRESS exactly while tasks remain.");
}
/** Full structural validation of a workflow plan; throws WorkflowError. */
function validatePlan(plan) {
	ensure(plan && typeof plan === "object" && plan.schema === "harness-workflow-plan/1", schemaError, "Unsupported workflow plan schema.");
	ensure(Number.isSafeInteger(plan.revision) && plan.revision >= 1, schemaError, "revision must be a positive integer.");
	text(plan.projectId, "projectId");
	text(plan.projectName, "projectName");
	ensure(Array.isArray(plan.rounds) && Array.isArray(plan.tasks), schemaError, "rounds and tasks must be lists.");
	if (plan.lastClosed !== null) {
		identifier(plan.lastClosed.scopeId, "lastClosed.scopeId");
		text(plan.lastClosed.closedAt, "lastClosed.closedAt");
	}
	if (plan.scope === null) {
		ensure(plan.rounds.length === 0 && plan.tasks.length === 0 && plan.currentTaskId === null, schemaError, "A plan without scope has no rounds, tasks or current task.");
		return plan;
	}
	validateScope(plan.scope);
	validateRounds(plan);
	for (const task of plan.tasks) validateTaskFields(task);
	validateTaskGraph(plan);
	validateServiceTasks(plan);
	validateProgress(plan, plan.scope);
	return plan;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-document.ts
var BEGIN = "<!-- harness-workflow:begin -->";
var END = "<!-- harness-workflow:end -->";
var FENCED_JSON_PATTERN = /^```json\n([\s\S]+)\n```$/u;
var CRLF_PATTERN = /\r\n/gu;
function taskLine(task) {
	const lines = [`- [${task.status}] ${task.id} — ${task.title} (${task.kind})`, `  - Commit: ${task.commitMessage}`];
	if (task.files.length > 0) lines.push(`  - Files: ${task.files.join(", ")}`);
	if (task.dependencies.length > 0) lines.push(`  - Depends on: ${task.dependencies.join(", ")}`);
	if (task.fixes) lines.push(`  - Fixes: ${task.fixes}`);
	return lines;
}
function roundLines(round, tasks) {
	const lines = [`### ${round.id} — ${round.title} (${round.kind}, ${round.status})`, ""];
	for (const task of tasks.filter((item) => item.roundId === round.id)) lines.push(...taskLine(task));
	if (round.digest) lines.push("", `Digest: ${round.digest.result}`);
	lines.push("");
	return lines;
}
function scopeLines(plan) {
	const scope = plan.scope;
	if (!scope) return [
		"## State",
		"",
		`No active scope.${plan.lastClosed ? ` Last closed scope: ${plan.lastClosed.scopeId}.` : ""}`,
		""
	];
	const done = plan.tasks.filter((task) => task.status === "DONE").length;
	return [
		"## State",
		"",
		`- Scope: ${scope.id} (${scope.status}${scope.blockedReason ? `: ${scope.blockedReason}` : ""})`,
		`- Delivery: ${scope.delivery}`,
		`- Current task: ${plan.currentTaskId ?? "none"}`,
		`- Progress: ${done}/${plan.tasks.length}`,
		`- Revision: ${plan.revision}`,
		"",
		"## Objective",
		"",
		scope.objective,
		"",
		"## Acceptance",
		"",
		...scope.acceptance.map((item) => `- ${item}`),
		"",
		"## Rounds",
		"",
		...plan.rounds.flatMap((round) => roundLines(round, plan.tasks))
	];
}
/** Renders the canonical plan document: JSON state plus a readable projection. */
function renderPlanDocument(plan) {
	validatePlan(plan);
	return [
		`# Workflow Plan — ${plan.projectName}`,
		"",
		BEGIN,
		"```json",
		JSON.stringify(plan, null, 2),
		"```",
		END,
		"",
		...scopeLines(plan),
		"State changes only through `scripts/workflow` commands. History lives in Git.",
		""
	].join("\n");
}
/** Extracts the JSON state without validating it. */
function extractPlanState(text) {
	const normalized = text.replace(CRLF_PATTERN, "\n");
	ensure(normalized.split(BEGIN).length === 2 && normalized.split(END).length === 2, "PLAN_MARKERS", "The plan needs exactly one harness-workflow state block.");
	const fragment = normalized.split(BEGIN)[1]?.split(END)[0]?.trim() ?? "";
	const match = FENCED_JSON_PATTERN.exec(fragment);
	ensure(match?.[1], "PLAN_MARKERS", "The state block must hold one fenced JSON block.");
	try {
		return JSON.parse(match[1]);
	} catch {
		throw new WorkflowError("PLAN_JSON", "The plan state is not valid JSON.");
	}
}
function isWorkflowPlanDocument(text) {
	return text.includes(BEGIN) && text.includes(END);
}
/**
* Parses and validates a plan document. With `projection` the readable part
* must match the canonical rendering, so manual edits are detected.
*/
function parsePlanDocument(text, options = {}) {
	const plan = validatePlan(extractPlanState(text));
	if (options.projection ?? true) ensure(renderPlanDocument(plan) === text.replace(CRLF_PATTERN, "\n"), "PLAN_PROJECTION", "The readable part of the plan was edited manually.", {}, "Run `scripts/workflow repair` to rebuild it from the JSON state.");
	return plan;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-service-tasks.ts
var QUALITY_TITLE = "Configure the project quality profile";
var DOCS_TITLE = "Reconcile project documentation and write the round digest";
var DEFAULT_DOCS_FILES = ["README.md", "docs/architecture/OVERVIEW.md"];
var AUTO_ID_PATTERN = /^T([0-9]+)$/u;
function nextAutoId(existing) {
	let highest = 0;
	for (const id of existing) {
		const match = AUTO_ID_PATTERN.exec(id);
		highest = Math.max(highest, match ? Number(match[1]) : 0);
	}
	return `T${String(highest + 1).padStart(3, "0")}`;
}
function normalizeTaskInput(input, roundId, existing) {
	ensure(input && typeof input === "object", "PLAN_SCHEMA", "Each task must be an object.");
	ensure(input.kind === void 0 || input.kind === "work" || input.kind === "delivery", "PLAN_SCHEMA", "Task kind in input must be work or delivery; Kit adds quality and docs tasks.");
	const id = input.id ?? nextAutoId(existing);
	ensure(!existing.has(id), "PLAN_SCHEMA", `Duplicate task id: ${id}`);
	existing.add(id);
	return {
		acceptance: input.acceptance,
		checks: input.checks ?? [],
		commitMessage: input.commitMessage,
		confirmation: null,
		context: input.context ?? [],
		dependencies: input.dependencies ?? [],
		docsWaiver: input.docsWaiver ?? null,
		files: input.files ?? [],
		fixes: input.fixes ?? null,
		id,
		iteration: 1,
		kind: input.kind ?? "work",
		roundId,
		status: "TODO",
		title: input.title,
		why: input.why ?? input.title
	};
}
function qualityTaskId(plan) {
	const used = new Set(plan.tasks.map((task) => task.id));
	let index = 1;
	let id = "QUALITY";
	while (used.has(id)) {
		index += 1;
		id = `QUALITY-${index}`;
	}
	return id;
}
function buildQualityTask(plan, roundId) {
	return {
		acceptance: ["Project stacks are detected or chosen from the architecture", "Quality checks are applied with `quality:apply` and the profile is CONFIGURED"],
		checks: [],
		commitMessage: "chore: configure the project quality profile",
		confirmation: null,
		context: [],
		dependencies: [],
		docsWaiver: null,
		files: [],
		fixes: null,
		id: qualityTaskId(plan),
		iteration: 1,
		kind: "quality",
		roundId,
		status: "TODO",
		title: QUALITY_TITLE,
		why: "Functional code needs a configured quality profile before its first commit."
	};
}
function buildDocsTask(roundId, files) {
	return {
		acceptance: ["Project-wide documents describe the round result", "The round digest records result, decisions, contracts and references"],
		checks: [],
		commitMessage: `docs: reconcile documentation for ${roundId}`,
		confirmation: null,
		context: [],
		dependencies: [],
		docsWaiver: null,
		files: [.../* @__PURE__ */ new Set([...DEFAULT_DOCS_FILES, ...files])],
		fixes: null,
		id: docsTaskId(roundId),
		iteration: 1,
		kind: "docs",
		roundId,
		status: "TODO",
		title: DOCS_TITLE,
		why: "Keep the project context current for the next agent and close the round."
	};
}
/**
* Arranges one round: optional QUALITY before the first functional task,
* ordinary work, DOCS depending on all round work, then delivery tasks
* depending on DOCS.
*/
function arrangeRound(plan, roundId, tasks, options) {
	const delivery = tasks.filter((task) => task.kind === "delivery");
	const work = tasks.filter((task) => task.kind !== "delivery");
	const firstFunctional = work.findIndex((task) => task.kind === "work" && functionalFiles(task).length > 0);
	const hasQuality = plan.tasks.some((task) => task.kind === "quality" && task.status !== "DONE");
	if (!(options.qualityConfigured || hasQuality) && firstFunctional >= 0) {
		const quality = buildQualityTask(plan, roundId);
		work[firstFunctional] = {
			...work[firstFunctional],
			dependencies: [.../* @__PURE__ */ new Set([quality.id, ...work[firstFunctional]?.dependencies ?? []])]
		};
		work.splice(firstFunctional, 0, quality);
	}
	const roundWork = [...plan.tasks.filter((task) => task.roundId === roundId && task.kind !== "docs" && task.kind !== "delivery"), ...work];
	const documentation = work.flatMap((task) => task.files.filter(isDocumentationPath));
	const docs = buildDocsTask(roundId, [...options.docsFiles, ...documentation]);
	docs.dependencies = roundWork.map((task) => task.id);
	const arrangedDelivery = delivery.map((task) => ({
		...task,
		dependencies: [.../* @__PURE__ */ new Set([...task.dependencies, docs.id])]
	}));
	return [
		...work,
		docs,
		...arrangedDelivery
	];
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-transitions.ts
/** Returns a deep copy with the revision advanced; every transition starts here. */
function nextRevision(plan) {
	const copy = structuredClone(plan);
	copy.revision += 1;
	return copy;
}
function recomputeDelivery(plan) {
	if (!plan.scope) return;
	if (!(plan.tasks.length > 0 && plan.tasks.every((task) => task.status === "DONE"))) {
		plan.scope.delivery = "IN_PROGRESS";
		plan.scope.acceptanceNote = null;
	} else if (plan.scope.delivery === "IN_PROGRESS") plan.scope.delivery = "READY_FOR_ACCEPTANCE";
}
function decision(text, now) {
	return {
		at: now,
		text
	};
}
function createScope$1(plan, input, context) {
	ensure(plan.scope === null, "SCOPE_EXISTS", "The current scope is still open; close it before creating a new one.");
	ensure(context.baselineCommit, "NO_BASELINE", "The repository needs a first commit before a scope can start.", {}, "Finish the kit bootstrap commit first.");
	ensure(Array.isArray(input.tasks) && input.tasks.length > 0, "PLAN_SCHEMA", "A scope needs at least one task.");
	ensure(typeof input.approval === "string" && input.approval.trim().length >= 10, "SCOPE_APPROVAL", "Record the user-approved scope content in `approval` (at least 10 characters).");
	ensure(input.tasks.length === 1 || typeof input.spec === "string" && input.spec !== "", "SPEC_REQUIRED", "A scope with several tasks needs a specification document in `spec`.");
	const next = nextRevision(plan);
	const ids = /* @__PURE__ */ new Set();
	const tasks = input.tasks.map((task) => normalizeTaskInput(task, "R1", ids));
	next.scope = {
		acceptance: input.acceptance,
		acceptanceNote: null,
		approval: decision(input.approval, context.now),
		baselineCommit: context.baselineCommit,
		blockedReason: null,
		context: input.context ?? [],
		decisions: (input.decisions ?? []).map((text) => decision(text, context.now)),
		delivery: "IN_PROGRESS",
		id: input.id,
		objective: input.objective,
		spec: input.spec ?? null,
		status: "ACTIVE"
	};
	next.rounds = [{
		digest: null,
		id: "R1",
		kind: "implementation",
		status: "OPEN",
		title: "Implementation"
	}];
	next.tasks = arrangeRound(next, "R1", tasks, {
		docsFiles: input.spec ? [input.spec] : [],
		qualityConfigured: context.qualityConfigured
	});
	next.currentTaskId = null;
	return validatePlan(next);
}
function findTask(plan, taskId) {
	const task = plan.tasks.find((item) => item.id === taskId);
	ensure(task, "UNKNOWN_TASK", `Task not found: ${taskId}`);
	return task;
}
function nextReadyTask(plan) {
	const current = plan.tasks.find((task) => task.id === plan.currentTaskId);
	if (current) return current;
	const done = new Set(plan.tasks.filter((task) => task.status === "DONE").map((task) => task.id));
	return plan.tasks.find((task) => task.status === "TODO" && task.dependencies.every((id) => done.has(id))) ?? null;
}
function startTask$1(plan, taskId, confirmation) {
	ensure(plan.scope?.status === "ACTIVE", "SCOPE_NOT_ACTIVE", "Implementation needs an ACTIVE scope.");
	const task = findTask(plan, taskId);
	if (plan.currentTaskId === taskId) return plan;
	ensure(plan.currentTaskId === null, "TASK_ALREADY_ACTIVE", `Task ${plan.currentTaskId} is in progress; finish it first.`);
	ensure(task.status === "TODO", "TASK_NOT_TODO", `Task ${taskId} is already ${task.status}.`);
	const pending = task.dependencies.filter((id) => findTask(plan, id).status !== "DONE");
	ensure(pending.length === 0, "DEPENDENCY_PENDING", `Finish the dependencies first: ${pending.join(", ")}`, { pending });
	ensure(task.kind !== "delivery" || (confirmation ?? "").trim() !== "", "DELIVERY_CONFIRMATION", "Delivery tasks start only with the user's confirmation (`--confirmed \"...\"`).");
	const next = nextRevision(plan);
	const started = findTask(next, taskId);
	started.status = "IN_PROGRESS";
	if (started.kind === "delivery") started.confirmation = confirmation;
	next.currentTaskId = taskId;
	return validatePlan(next);
}
function blockScope(plan, reason) {
	ensure(plan.scope?.status === "ACTIVE", "SCOPE_NOT_ACTIVE", "Only an ACTIVE scope can be blocked.");
	ensure(typeof reason === "string" && reason.trim() !== "", "BLOCK_REASON", "Give the reason of the block.");
	const next = nextRevision(plan);
	if (next.scope) {
		next.scope.status = "BLOCKED";
		next.scope.blockedReason = reason.trim();
	}
	return validatePlan(next);
}
function unblockScope(plan) {
	ensure(plan.scope?.status === "BLOCKED", "SCOPE_NOT_BLOCKED", "The scope is not blocked.");
	const next = nextRevision(plan);
	if (next.scope) {
		next.scope.status = "ACTIVE";
		next.scope.blockedReason = null;
	}
	return validatePlan(next);
}
/** A round closes once all of its tasks are DONE and its digest is recorded. */
function closeFinishedRounds(plan) {
	for (const round of plan.rounds) {
		const tasks = plan.tasks.filter((task) => task.roundId === round.id);
		if (round.status === "OPEN" && round.digest && tasks.every((task) => task.status === "DONE")) round.status = "CLOSED";
	}
}
/** Marks the current task DONE; a DOCS task also closes its round with the digest. */
function completeTask(plan, taskId, digest) {
	ensure(plan.currentTaskId === taskId, "TASK_NOT_ACTIVE", `Start the task first: task:start ${taskId}`);
	const next = nextRevision(plan);
	const task = findTask(next, taskId);
	task.status = "DONE";
	next.currentTaskId = null;
	if (task.kind === "docs") {
		validateDigest(digest);
		const round = next.rounds.find((item) => item.id === task.roundId);
		if (round && digest) round.digest = {
			contracts: [...digest.contracts],
			decisions: [...digest.decisions],
			references: [...digest.references],
			result: digest.result
		};
	}
	closeFinishedRounds(next);
	recomputeDelivery(next);
	return validatePlan(next);
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-rounds.ts
var ROUND_NUMBER_PATTERN = /^R([0-9]+)$/u;
function nextRoundId(plan) {
	const numbers = plan.rounds.map((round) => Number(ROUND_NUMBER_PATTERN.exec(round.id)?.[1] ?? 0));
	return `R${Math.max(0, ...numbers) + 1}`;
}
function roundTasks(plan, roundId) {
	return plan.tasks.filter((task) => task.roundId === roundId);
}
function docsDone(plan, round) {
	return roundTasks(plan, round.id).some((task) => task.kind === "docs" && task.status === "DONE");
}
function needsQuality(plan, tasks, qualityConfigured) {
	const pending = plan.tasks.some((task) => task.kind === "quality" && task.status !== "DONE");
	return !(qualityConfigured || pending) && tasks.some((task) => task.kind === "work" && functionalFiles(task).length > 0);
}
function startNewRound(plan, input, tasks, context) {
	const last = plan.rounds.at(-1);
	const roundId = nextRoundId(plan);
	let carried = [];
	if (last && last.status === "OPEN") {
		const pending = roundTasks(plan, last.id).filter((task) => task.status !== "DONE");
		ensure(pending.every((task) => task.kind === "delivery" && task.status === "TODO"), "ROUND_OPEN", `Round ${last.id} still has unfinished work; extend it with round "current".`);
		carried = pending.map((task) => ({
			...task,
			dependencies: task.dependencies.filter((id) => id !== docsTaskId(last.id)),
			roundId
		}));
		plan.tasks = plan.tasks.filter((task) => !carried.some((item) => item.id === task.id));
		last.status = "CLOSED";
	}
	plan.rounds.push({
		digest: null,
		id: roundId,
		kind: input.kind ?? "fixes",
		status: "OPEN",
		title: input.title ?? "Fixes"
	});
	for (const task of tasks) task.roundId = roundId;
	plan.tasks.push(...arrangeRound(plan, roundId, [...tasks, ...carried], {
		docsFiles: [],
		qualityConfigured: context.qualityConfigured
	}));
	return roundId;
}
function insertBefore(list, task, beforeId, fallbackId) {
	const target = beforeId ?? fallbackId;
	const index = list.findIndex((item) => item.id === target);
	ensure(index >= 0, "UNKNOWN_TASK", `Task not found for insertion: ${target}`);
	const anchor = list[index];
	ensure(beforeId === void 0 || anchor?.status === "TODO", "TASK_STARTED", `Insert only before a task that has not started: ${target}`);
	if (beforeId !== void 0 && anchor) anchor.dependencies = [.../* @__PURE__ */ new Set([...anchor.dependencies, task.id])];
	list.splice(index, 0, task);
}
function addQualityIfNeeded(plan, roundId, placed, context) {
	if (!needsQuality(plan, placed.map((item) => item.task).filter((task) => task.kind !== "delivery"), context.qualityConfigured)) return;
	const quality = buildQualityTask(plan, roundId);
	const firstFunctional = placed.find((item) => item.task.kind === "work" && functionalFiles(item.task).length > 0);
	if (firstFunctional) {
		firstFunctional.task.dependencies = [.../* @__PURE__ */ new Set([quality.id, ...firstFunctional.task.dependencies])];
		placed.splice(placed.indexOf(firstFunctional), 0, {
			before: firstFunctional.before,
			task: quality
		});
	}
}
function extendOpenRound(plan, round, placed, context) {
	const docs = plan.tasks.find((task) => task.id === docsTaskId(round.id));
	ensure(docs, "DOCS_TASK", `Round ${round.id} has no DOCS task.`);
	let deferred = null;
	if (docs.status === "IN_PROGRESS") {
		docs.status = "TODO";
		plan.currentTaskId = null;
		deferred = docs.id;
	}
	addQualityIfNeeded(plan, round.id, placed, context);
	for (const { before, task } of placed.filter((item) => item.task.kind !== "delivery")) insertBefore(plan.tasks, task, before, docs.id);
	for (const { task } of placed.filter((item) => item.task.kind === "delivery")) plan.tasks.push({
		...task,
		dependencies: [.../* @__PURE__ */ new Set([...task.dependencies, docs.id])]
	});
	const roundWork = roundTasks(plan, round.id).filter((task) => task.kind === "work" || task.kind === "quality");
	docs.dependencies = roundWork.map((task) => task.id);
	docs.files = [.../* @__PURE__ */ new Set([...docs.files, ...roundWork.flatMap((task) => task.files.filter(isDocumentationPath))])];
	return deferred;
}
/** Adds tasks to the open round or to a new round; finished records stay untouched. */
function extendPlan(plan, input, context) {
	ensure(plan.scope !== null, "NO_SCOPE", "There is no active scope to extend.");
	ensure(Array.isArray(input.tasks) && input.tasks.length > 0, "PLAN_SCHEMA", "plan:extend needs at least one task.");
	const next = nextRevision(plan);
	const ids = new Set(next.tasks.map((task) => task.id));
	const last = next.rounds.at(-1);
	const wantsNew = input.round === "new" || !last || last.status === "CLOSED" || docsDone(next, last);
	const targetId = wantsNew ? nextRoundId(next) : last?.id ?? "R1";
	const placed = input.tasks.map((source) => ({
		before: source.before,
		task: normalizeTaskInput(source, targetId, ids)
	}));
	let deferred = null;
	let roundId = targetId;
	if (wantsNew) {
		ensure(placed.every((item) => item.before === void 0), "PLAN_SCHEMA", "`before` applies only to the current round.");
		roundId = startNewRound(next, input, placed.map((item) => item.task), context);
	} else if (last) deferred = extendOpenRound(next, last, placed, context);
	recomputeDelivery(next);
	return {
		deferredDocsTaskId: deferred,
		plan: validatePlan(next),
		roundId
	};
}
/** Moves an in-progress DOCS task back to TODO (repair action defer-docs). */
function deferDocs(plan) {
	const current = plan.tasks.find((task) => task.id === plan.currentTaskId);
	ensure(current?.kind === "docs", "NOT_DOCS", "The current task is not a DOCS task.");
	const next = nextRevision(plan);
	const docs = next.tasks.find((task) => task.id === current.id);
	if (docs) docs.status = "TODO";
	next.currentTaskId = null;
	return validatePlan(next);
}
function acceptScope$1(plan, note, now) {
	ensure(plan.scope?.delivery === "READY_FOR_ACCEPTANCE", "NOT_READY", "Acceptance needs every task DONE (READY_FOR_ACCEPTANCE).");
	ensure(typeof note === "string" && note.trim().length >= 3, "ACCEPTANCE_NOTE", "Record the user's acceptance words in --note.");
	const next = nextRevision(plan);
	if (next.scope) {
		next.scope.delivery = "ACCEPTED";
		next.scope.acceptanceNote = {
			at: now,
			text: note.trim()
		};
	}
	return validatePlan(next);
}
function closeScope$1(plan, scopeId, note, now) {
	ensure(plan.scope && plan.scope.id === scopeId, "SCOPE_ID", "Pass the exact id of the scope to close (--scope).");
	ensure(plan.scope.delivery === "ACCEPTED", "NOT_ACCEPTED", "Only an ACCEPTED scope closes; record acceptance first.");
	ensure(typeof note === "string" && note.trim().length >= 10, "USER_CLOSE_REQUIRED", "Closing needs the user's direct command in --note; acceptance alone is not one.");
	const closed = emptyPlan(plan.projectId, plan.projectName);
	closed.revision = plan.revision + 1;
	closed.lastClosed = {
		closedAt: now,
		scopeId
	};
	return validatePlan(closed);
}
/** Closes the current scope and opens a new one with every unfinished task. */
function carryoverScope$1(plan, input, context) {
	const scope = plan.scope;
	ensure(scope, "NO_SCOPE", "There is no scope to carry over.");
	ensure(typeof input.approval === "string" && input.approval.trim().length >= 10, "SCOPE_APPROVAL", "carryover needs the user's direct instruction in `approval`.");
	ensure(context.baselineCommit, "NO_BASELINE", "carryover needs the current HEAD.");
	const done = new Set(plan.tasks.filter((task) => task.status === "DONE").map((task) => task.id));
	const unfinished = plan.tasks.filter((task) => task.status !== "DONE" && task.kind !== "docs");
	ensure(unfinished.length > 0, "NOTHING_TO_CARRY", "Every task is DONE; accept and close the scope instead.");
	const next = nextRevision(plan);
	const tasks = unfinished.map((task) => ({
		...structuredClone(task),
		confirmation: null,
		dependencies: task.dependencies.filter((id) => !done.has(id) && unfinished.some((item) => item.id === id)),
		fixes: unfinished.some((item) => item.id === task.fixes) ? task.fixes : null,
		roundId: "R1",
		status: "TODO"
	}));
	next.lastClosed = {
		closedAt: context.now,
		scopeId: scope.id
	};
	next.scope = {
		...structuredClone(scope),
		acceptanceNote: null,
		approval: {
			at: context.now,
			text: input.approval.trim()
		},
		baselineCommit: context.baselineCommit,
		blockedReason: null,
		decisions: [{
			at: context.now,
			text: `Carried over unfinished tasks from scope ${scope.id}.`
		}],
		delivery: "IN_PROGRESS",
		id: input.id,
		objective: input.objective ?? scope.objective,
		status: "ACTIVE"
	};
	next.rounds = [{
		digest: null,
		id: "R1",
		kind: "implementation",
		status: "OPEN",
		title: "Carried over"
	}];
	next.tasks = [];
	next.currentTaskId = null;
	next.tasks = arrangeRound(next, "R1", tasks.filter((task) => task.kind !== "quality"), {
		docsFiles: scope.spec ? [scope.spec] : [],
		qualityConfigured: context.qualityConfigured
	});
	return validatePlan(next);
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts
/**
* Public boundary of the workflow-plan module: the plan model, its
* validation, the Markdown document and every state transition.
*/
var WorkflowPlanFacade = class {
	createEmpty(projectId, projectName) {
		return emptyPlan(projectId, projectName);
	}
	validate(plan) {
		return validatePlan(plan);
	}
	validateDigest(digest) {
		validateDigest(digest);
	}
	render(plan) {
		return renderPlanDocument(plan);
	}
	parse(text, options) {
		return parsePlanDocument(text, options);
	}
	isPlanDocument(text) {
		return isWorkflowPlanDocument(text);
	}
	planFile(root) {
		return path.join(root, ...PLAN_PATH.split("/"));
	}
	/** Reads the project plan; returns null when the project has no plan file. */
	read(root, options) {
		const text = workflowPlatformFacade.readTextIfExists(this.planFile(root));
		return text === null ? null : parsePlanDocument(text, options);
	}
	createScope(plan, input, context) {
		return createScope$1(plan, input, context);
	}
	startTask(plan, taskId, confirmation = null) {
		return startTask$1(plan, taskId, confirmation);
	}
	completeTask(plan, taskId, digest = null) {
		return completeTask(plan, taskId, digest);
	}
	block(plan, reason) {
		return blockScope(plan, reason);
	}
	unblock(plan) {
		return unblockScope(plan);
	}
	extend(plan, input, context) {
		return extendPlan(plan, input, context);
	}
	deferDocs(plan) {
		return deferDocs(plan);
	}
	accept(plan, note, now) {
		return acceptScope$1(plan, note, now);
	}
	close(plan, scopeId, note, now) {
		return closeScope$1(plan, scopeId, note, now);
	}
	carryover(plan, input, context) {
		return carryoverScope$1(plan, input, context);
	}
	task(plan, taskId) {
		return findTask(plan, taskId);
	}
	/** The current task, or the first TODO task whose dependencies are DONE. */
	nextTask(plan) {
		return nextReadyTask(plan);
	}
	write(root, plan) {
		const text = renderPlanDocument(plan);
		workflowPlatformFacade.writeFileAtomic(this.planFile(root), text);
		return text;
	}
};
var workflowPlanFacade = new WorkflowPlanFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts
var COMMIT_TIMEOUT_MS = 1800 * 1e3;
var NEXT_ACTION_RETRY = "Fix the reported problem and repeat the same command; your edits are kept.";
function head$1(git, root) {
	const output = git.run(root, [
		"rev-parse",
		"--verify",
		"-q",
		"HEAD"
	], { allowFailure: true });
	return output.status === 0 ? output.stdout.trim() : null;
}
function planAbsolute(root, planPath) {
	return path.join(root, ...planPath.split("/"));
}
function indexFile(git, root) {
	return git.text(root, [
		"rev-parse",
		"--path-format=absolute",
		"--git-path",
		"index"
	]);
}
/** Returns the SHA when HEAD is exactly the commit this journal produced. */
function confirmedCommit(git, root, journal) {
	const now = head$1(git, root);
	if (!now || now === journal.beforeHead) return null;
	const [commit] = readHistory(git, root, journal.beforeHead, now).slice(-1);
	if (!commit || commit.trailers["Workflow-Transaction"]?.[0] !== journal.id) return null;
	ensure((commit.parents[0] ?? null) === journal.beforeHead && commit.parents.length <= 1, "TRANSACTION_PARENT", "The commit parent does not match the transaction.");
	ensure(git.text(root, ["rev-parse", "HEAD^{tree}"]) === journal.candidateTree, "TRANSACTION_TREE", "The commit content differs from the prepared candidate.");
	return now;
}
function finalize(root, journal, sha) {
	const pending = localPath(root, "verification", `pending-${journal.id}.json`);
	if (existsSync(pending)) {
		const evidence = {
			...JSON.parse(readFileSync(pending, "utf8")),
			commit: sha
		};
		const text = `${JSON.stringify(evidence, null, 2)}\n`;
		workflowPlatformFacade.writeFileAtomic(localPath(root, "verification", `${sha}.json`), text);
		workflowPlatformFacade.writeFileAtomic(localPath(root, "verification", "last.json"), text);
	}
	workflowPlatformFacade.writeFileAtomic(localPath(root, "last-commit.json"), `${JSON.stringify({
		role: journal.role,
		scopeId: journal.scopeId,
		sha,
		taskId: journal.taskId,
		transaction: journal.id
	}, null, 2)}\n`);
	removeJournal(root);
	return {
		excluded: journal.excluded,
		role: journal.role,
		sha,
		taskId: journal.taskId
	};
}
function rollback(git, root, journal) {
	const backup = localPath(root, "index-before");
	const plan = planAbsolute(root, journal.planPath);
	if (!(head$1(git, root) === journal.beforeHead && existsSync(plan) && sha256$1(readFileSync(plan)) === journal.candidateHash && git.text(root, ["write-tree"]) === journal.candidateTree)) return false;
	if (existsSync(backup)) workflowPlatformFacade.writeFileAtomic(indexFile(git, root), readFileSync(backup));
	else if (journal.beforeHead) git.run(root, ["read-tree", journal.beforeHead]);
	else git.run(root, ["read-tree", "--empty"]);
	if (journal.originalPlan === null) rmSync(plan, { force: true });
	else workflowPlatformFacade.writeFileAtomic(plan, journal.originalPlan);
	workflowPlatformFacade.writeFileAtomic(localPath(root, "verification", `failed-${journal.id}.json`), `${JSON.stringify(journal, null, 2)}\n`);
	removeJournal(root);
	return true;
}
function stage(git, root, files) {
	const tracked = new Set(git.run(root, [
		"ls-files",
		"-z",
		"--",
		...files
	]).stdout.split("\0").filter(Boolean));
	const stageable = files.filter((file) => tracked.has(file) || existsSync(path.join(root, ...file.split("/"))));
	if (stageable.length > 0) git.run(root, [
		"add",
		"-A",
		"--",
		...stageable
	]);
}
function prepareJournal(git, root, request, id) {
	const plan = planAbsolute(root, request.planPath);
	const originalPlan = existsSync(plan) ? readFileSync(plan, "utf8") : null;
	const index = indexFile(git, root);
	if (existsSync(index)) copyFileSync(index, localPath(root, "index-before"));
	return {
		beforeHead: head$1(git, root),
		candidateHash: sha256$1(request.planText),
		candidatePlan: request.planText,
		candidateTree: null,
		checkedSnapshot: null,
		checks: request.checks ?? [],
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		error: null,
		excluded: request.excluded ?? [],
		id,
		iteration: request.iteration ?? 1,
		message: request.message,
		originalPlan,
		phase: "PREPARING",
		planPath: request.planPath,
		role: request.role,
		schema: 1,
		scopeId: request.scopeId,
		selected: [.../* @__PURE__ */ new Set([...request.files, request.planPath])].sort(),
		taskId: request.taskId
	};
}
/**
* Creates one commit through a journaled transaction. Failed hook checks roll
* the plan and index back while keeping every working-tree edit.
*/
function commitCandidate(git, root, request, id) {
	ensure(readJournal(root) === null, "TRANSACTION_PENDING", "Another commit transaction is unfinished.", {}, "Run `scripts/workflow repair` to finish or cancel it.");
	const staged = readChanges(git, root).staged;
	const allowed = /* @__PURE__ */ new Set([...request.files, request.planPath]);
	const foreign = staged.filter((file) => !allowed.has(file));
	ensure(foreign.length === 0, "FOREIGN_STAGED", "The index holds files outside this operation; unstage them first.", { paths: foreign });
	mkdirSync(localPath(root), { recursive: true });
	const journal = prepareJournal(git, root, request, id);
	saveJournal(root, journal);
	request.prepare?.(request.files);
	workflowPlatformFacade.writeFileAtomic(planAbsolute(root, request.planPath), request.planText);
	stage(git, root, journal.selected);
	if (!(git.run(root, [
		"diff",
		"--cached",
		"--quiet"
	], { allowFailure: true }).status === 1)) {
		rollback(git, root, {
			...journal,
			candidateTree: git.text(root, ["write-tree"])
		});
		throw new WorkflowError("NOTHING_TO_COMMIT", "There are no changes to commit.");
	}
	journal.candidateTree = git.text(root, ["write-tree"]);
	journal.phase = "PREPARED";
	saveJournal(root, journal);
	const result = git.run(root, [
		"commit",
		"-q",
		"-F",
		"-"
	], {
		allowFailure: true,
		input: commitMessageFor(journal),
		timeoutMs: COMMIT_TIMEOUT_MS
	});
	if (result.status !== 0) {
		const failed = {
			...readJournal(root) ?? journal,
			error: `${result.stderr}${result.stdout}`.slice(-8e3),
			phase: "FAILED"
		};
		saveJournal(root, failed);
		const restored = rollback(git, root, failed);
		throw new WorkflowError("COMMIT_FAILED", restored ? "A commit check failed. The plan and index were restored; your edits are kept." : "The commit failed and the project changed concurrently; the journal is kept.", {
			output: failed.error,
			retryable: restored
		}, restored ? NEXT_ACTION_RETRY : "Run `scripts/workflow repair`.");
	}
	const sha = confirmedCommit(git, root, journal);
	ensure(sha, "COMMIT_NOT_CONFIRMED", "Git finished but the expected commit was not found.", {}, "Run `scripts/workflow repair`.");
	return finalize(root, readJournal(root) ?? journal, sha);
}
/** Finishes the bookkeeping of a transaction whose commit already exists. */
function finishConfirmed(git, root) {
	const journal = readJournal(root);
	if (!journal) return null;
	const sha = confirmedCommit(git, root, journal);
	return sha ? finalize(root, journal, sha) : null;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-repair.ts
var MESSAGES = {
	"defer-docs": "Move the in-progress DOCS task back to TODO until the added work is done; files are kept.",
	"finish-commit": "The commit exists; finish the transaction bookkeeping.",
	none: "No damage found.",
	projection: "Rebuild the readable part of the plan from its JSON state.",
	"retry-commit": "Repeat the prepared commit transaction; edits are kept."
};
function head(git, root) {
	return git.run(root, [
		"rev-parse",
		"--verify",
		"-q",
		"HEAD"
	], { allowFailure: true }).stdout.trim();
}
function planText(root, planPath) {
	return workflowPlatformFacade.readTextIfExists(path.join(root, ...planPath.split("/"))) ?? "";
}
function detect(git, root, planPath) {
	const journal = readJournal(root);
	if (journal) return confirmedCommit(git, root, journal) ? "finish-commit" : "retry-commit";
	const text = planText(root, planPath);
	if (!workflowPlanFacade.isPlanDocument(text)) return "none";
	const plan = workflowPlanFacade.parse(text, { projection: false });
	if (workflowPlanFacade.render(plan) !== text.replaceAll("\r\n", "\n")) return "projection";
	const current = plan.tasks.find((task) => task.id === plan.currentTaskId);
	return current?.kind === "docs" && current.dependencies.some((id) => plan.tasks.find((task) => task.id === id)?.status !== "DONE") ? "defer-docs" : "none";
}
/** Dry run: what repair would do, with an id that pins the observed state. */
function planRepair(git, root, planPath) {
	const kind = detect(git, root, planPath);
	const journal = readJournal(root);
	const repairId = sha256$1(JSON.stringify([
		kind,
		head(git, root),
		sha256$1(planText(root, planPath)),
		journal?.id ?? null
	])).slice(0, 24);
	return {
		kind,
		message: MESSAGES[kind],
		repairId
	};
}
function retry(git, root) {
	const journal = readJournal(root);
	ensure(journal, "NO_TRANSACTION", "There is no transaction to retry.");
	ensure(rollback(git, root, journal), "REPAIR_MANUAL", "HEAD, plan or index changed after preparation; resolve manually.", {}, "Inspect `git status` and `.harness/workflow/local/transaction.json`.");
	return commitCandidate(git, root, {
		checks: journal.checks,
		excluded: journal.excluded,
		files: journal.selected.filter((file) => file !== journal.planPath),
		iteration: journal.iteration,
		message: journal.message,
		planPath: journal.planPath,
		planText: journal.candidatePlan,
		role: journal.role,
		scopeId: journal.scopeId,
		taskId: journal.taskId
	}, journal.id);
}
function applyRepair(git, root, planPath, repairId) {
	const planned = planRepair(git, root, planPath);
	ensure(planned.repairId === repairId, "REPAIR_CHANGED", "The project changed; run `repair` again for a fresh id.");
	if (planned.kind === "finish-commit") return {
		commit: finishConfirmed(git, root),
		kind: planned.kind,
		message: planned.message
	};
	if (planned.kind === "retry-commit") return {
		commit: retry(git, root),
		kind: planned.kind,
		message: planned.message
	};
	const text = readFileSync(path.join(root, ...planPath.split("/")), "utf8");
	const plan = workflowPlanFacade.parse(text, { projection: false });
	if (planned.kind === "projection") workflowPlanFacade.write(root, plan);
	else if (planned.kind === "defer-docs") workflowPlanFacade.write(root, workflowPlanFacade.deferDocs(plan));
	return {
		commit: null,
		kind: planned.kind,
		message: planned.message
	};
}
function cancelRepair(git, root, planPath, repairId) {
	const planned = planRepair(git, root, planPath);
	ensure(planned.repairId === repairId, "REPAIR_CHANGED", "The project changed; run `repair` again for a fresh id.");
	ensure(planned.kind === "retry-commit", "NO_PREPARATION", "Only an unconfirmed commit preparation can be cancelled.");
	const journal = readJournal(root);
	ensure(journal && rollback(git, root, journal), "REPAIR_MANUAL", "The preparation cannot be rolled back automatically.");
	return {
		commit: null,
		kind: "cancel",
		message: "Preparation cancelled; edits are kept and the task stays open."
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-runner.ts
var DEFAULT_TIMEOUT_MS$1 = 12e4;
/** Thin synchronous git runner bound to one environment. */
var GitRunner = class {
	env;
	platform;
	constructor(platform, env) {
		this.platform = platform;
		this.env = env;
	}
	run(root, args, options = {}) {
		const result = this.platform.run({
			args,
			cwd: root,
			env: this.env,
			executable: "git",
			input: options.input,
			timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS$1
		});
		ensure(result.errorMessage === null || result.status !== null, "GIT_UNAVAILABLE", `Git could not run: ${result.errorMessage ?? "unknown error"}`, {}, "Install Git and make sure it is on PATH.");
		const output = {
			status: result.status ?? 1,
			stderr: result.stderr,
			stdout: result.stdout
		};
		ensure(options.allowFailure || output.status === 0, "GIT_FAILED", `git ${args.join(" ")} failed: ${output.stderr.trim() || output.stdout.trim()}`, {
			args,
			status: output.status
		});
		return output;
	}
	text(root, args, options = {}) {
		return this.run(root, args, options).stdout.trim();
	}
	succeeds(root, args) {
		return this.run(root, args, { allowFailure: true }).status === 0;
	}
};
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-task-files.ts
var PRIVATE_PATTERNS = [
	/(?:^|\/)\.env(?:\.[^/]*)?$/u,
	/\.(?:pem|key|p12|pfx)$/iu,
	/(?:^|\/)id_(?:rsa|ed25519|ecdsa)(?:\.pub)?$/u,
	/(?:^|\/)\.npmrc$/u
];
var KIT_MANAGED_PREFIXES = [
	".harness/workflow/",
	".harness/plans/",
	".harness/runtime/"
];
function isPrivatePath(file) {
	return PRIVATE_PATTERNS.some((pattern) => pattern.test(file));
}
function isKitManagedPath(file) {
	return KIT_MANAGED_PREFIXES.some((prefix) => file.startsWith(prefix));
}
function baselineFile(root, identity) {
	return localPath(root, "task-files", `${sha256$1(JSON.stringify([
		identity.scopeId,
		identity.taskId,
		identity.iteration
	])).slice(0, 24)}.json`);
}
function fingerprint(root, file) {
	const absolute = path.join(root, ...file.split("/"));
	const stat = lstatSync(absolute, { throwIfNoEntry: false });
	if (!stat) return "deleted";
	if (stat.isSymbolicLink()) return `link:${readlinkSync(absolute)}`;
	return stat.isDirectory() ? "directory" : sha256$1(readFileSync(absolute));
}
/** Records the changes that already existed when the task started. */
function recordBaseline(root, identity, changed) {
	const preexisting = changed.filter((file) => !isKitManagedPath(file));
	const baseline = {
		...identity,
		fingerprints: Object.fromEntries(preexisting.map((file) => [file, fingerprint(root, file)])),
		preexisting
	};
	workflowPlatformFacade.writeFileAtomic(baselineFile(root, identity), `${JSON.stringify(baseline, null, 2)}\n`);
	return baseline;
}
function readBaseline(root, identity) {
	const file = baselineFile(root, identity);
	return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
/**
* Chooses the files of a task commit: explicit files when given, otherwise
* everything changed since task:start. Kit state and private files are never
* chosen implicitly; everything else that changed is reported as excluded.
*/
function selectTaskFiles(root, identity, changed, explicit) {
	const baseline = readBaseline(root, identity);
	let selected;
	if (explicit) {
		selected = [...new Set(explicit.map((file) => workflowPlatformFacade.normalizeRelative(file)))];
		for (const file of selected) ensure(!isKitManagedPath(file), "MANAGED_FILE", `Workflow Kit state changes only through its commands: ${file}`, { path: file });
	} else {
		ensure(baseline, "TASK_FILES_UNKNOWN", "There is no task:start snapshot; list the files with --files.", {}, `commit --task ${identity.taskId} --files '["path/to/file"]'`);
		const mixed = baseline.preexisting.filter((file) => changed.includes(file) && baseline.fingerprints[file] !== fingerprint(root, file));
		ensure(mixed.length === 0, "EXISTING_EDITS_CHANGED", "Files that had edits before the task changed again; choose the files explicitly with --files.", { paths: mixed });
		selected = changed.filter((file) => !(baseline.preexisting.includes(file) || isKitManagedPath(file) || isPrivatePath(file)));
	}
	const actual = selected.filter((file) => changed.includes(file)).sort();
	return {
		excluded: changed.filter((file) => !(actual.includes(file) || isKitManagedPath(file))),
		preexisting: baseline?.preexisting ?? null,
		selected: actual
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-facade.ts
/**
* Public boundary of the workflow-git module: git queries, the transactional
* task commit, commit reference resolution and repair.
*/
var WorkflowGitFacade = class {
	git;
	platform;
	constructor(platform = workflowPlatformFacade, env = process.env) {
		this.platform = platform;
		this.git = new GitRunner(platform, env);
	}
	isRepository(path) {
		return this.git.succeeds(path, ["rev-parse", "--is-inside-work-tree"]);
	}
	topLevel(path) {
		return this.git.text(path, ["rev-parse", "--show-toplevel"]);
	}
	init(root, branch = "main") {
		this.git.run(root, [
			"init",
			"-q",
			`--initial-branch=${branch}`
		]);
	}
	/** Full HEAD SHA, or null in a repository without commits. */
	head(root) {
		const output = this.git.run(root, [
			"rev-parse",
			"--verify",
			"-q",
			"HEAD"
		], { allowFailure: true });
		return output.status === 0 ? output.stdout.trim() : null;
	}
	identity(root) {
		const name = this.git.run(root, ["config", "user.name"], { allowFailure: true }).stdout.trim();
		const email = this.git.run(root, ["config", "user.email"], { allowFailure: true }).stdout.trim();
		return name && email ? {
			email,
			name
		} : null;
	}
	changes(root) {
		return readChanges(this.git, root);
	}
	history(root, from, tip = "HEAD") {
		return readHistory(this.git, root, from, tip);
	}
	commitPaths(root, sha) {
		return readCommitPaths(this.git, root, sha);
	}
	isAncestor(root, ancestor, descendant) {
		return this.git.succeeds(root, [
			"merge-base",
			"--is-ancestor",
			ancestor,
			descendant
		]);
	}
	/** File content at a revision (`:path` reads the index); null when absent. */
	show(root, revision, path) {
		const output = this.git.run(root, ["show", `${revision}:${path}`], { allowFailure: true });
		return output.status === 0 ? output.stdout : null;
	}
	config(root, key) {
		const value = this.git.run(root, [
			"config",
			"--get",
			key
		], { allowFailure: true }).stdout.trim();
		return value === "" ? null : value;
	}
	setConfig(root, key, value) {
		this.git.run(root, [
			"config",
			key,
			value
		]);
	}
	localPath(root, ...parts) {
		return localPath(root, ...parts);
	}
	isKitManagedPath(file) {
		return isKitManagedPath(file);
	}
	isPrivatePath(file) {
		return isPrivatePath(file);
	}
	/** Snapshot of the edits that existed when a task started. */
	beginTask(root, identity) {
		return recordBaseline(root, identity, this.changes(root).all);
	}
	selectTaskFiles(root, identity, explicit) {
		return selectTaskFiles(root, identity, this.changes(root).all, explicit);
	}
	/** Journaled commit transaction (see module.md). */
	get transactions() {
		return {
			cancel: (root) => {
				const journal = readJournal(root);
				return journal ? rollback(this.git, root, journal) : false;
			},
			commit: (root, request) => commitCandidate(this.git, root, request, randomUUID()),
			confirmed: (root, journal) => confirmedCommit(this.git, root, journal),
			finish: (root) => finishConfirmed(this.git, root),
			journal: (root) => readJournal(root)
		};
	}
	/** Maps each task to its commit; throws when plan and history disagree. */
	resolveReferences(root, plan, planPath) {
		return resolveTaskReferences(this.git, root, plan, planPath, readJournal(root));
	}
	planRepair(root, planPath) {
		return planRepair(this.git, root, planPath);
	}
	applyRepair(root, planPath, repairId) {
		return applyRepair(this.git, root, planPath, repairId);
	}
	cancelRepair(root, planPath, repairId) {
		return cancelRepair(this.git, root, planPath, repairId);
	}
	/** Absolute path of a path inside the git directory (e.g. `hooks`, `index`). */
	gitPath(root, name) {
		return this.git.text(root, [
			"rev-parse",
			"--path-format=absolute",
			"--git-path",
			name
		]);
	}
};
var workflowGitFacade = new WorkflowGitFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-config.ts
var CONFIG_PATH = ".harness/workflow/config.json";
var CONFIG_SCHEMA = "harness-workflow-config/1";
var ROLES = /* @__PURE__ */ new Set([
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
	"typecheck"
]);
var STAGES = /* @__PURE__ */ new Set([
	"prepare",
	"commit",
	"push",
	"delivery"
]);
var BUILTINS = /* @__PURE__ */ new Set([
	"kit:doc-size",
	"kit:docs-contracts",
	"kit:file-lines",
	"kit:md-links"
]);
var ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
var MAX_TIMEOUT_MS = 6e5;
var DEFAULT_TIMEOUT_MS = 12e4;
var MIN_RECOVERY_BYTES = 8e3;
var MAX_RECOVERY_BYTES = 12e4;
var error = "CONFIG_SCHEMA";
function builtinCheck(id) {
	return {
		builtin: id,
		id,
		required: true,
		role: "custom",
		stage: "commit",
		timeoutMs: DEFAULT_TIMEOUT_MS
	};
}
/** Fills optional check fields with their documented defaults. */
function normalizeCheck(input) {
	return {
		...input,
		required: input.required ?? false,
		timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS
	};
}
function defaultConfig() {
	return {
		autopilot: { maxContinues: 40 },
		budget: {
			documentBytes: 28e3,
			recoveryBytes: 32e3
		},
		docs: { contracts: [] },
		policy: {
			maxFileLines: null,
			taskFileSoftLimit: null
		},
		quality: {
			checks: [
				builtinCheck("kit:doc-size"),
				builtinCheck("kit:md-links"),
				builtinCheck("kit:file-lines"),
				builtinCheck("kit:docs-contracts")
			],
			packageManager: null,
			stacks: [],
			status: "DISCOVERY"
		},
		schema: CONFIG_SCHEMA
	};
}
function positiveInteger(value, field, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
	ensure(Number.isSafeInteger(value) && value >= min && value <= max, error, `${field} must be an integer between ${min} and ${max}.`, { field });
}
function validateCommand(check) {
	ensure(Boolean(check.command) !== Boolean(check.builtin), error, `Check ${check.id} needs exactly one of command or builtin.`);
	if (check.builtin) {
		ensure(BUILTINS.has(check.builtin), error, `Unknown builtin check: ${check.builtin}`);
		return;
	}
	const command = check.command;
	ensure(command && typeof command.executable === "string" && command.executable.trim() !== "", error, `Check ${check.id} needs command.executable.`);
	ensure(Array.isArray(command.args) && command.args.every((arg) => typeof arg === "string"), error, `Check ${check.id} needs command.args as a list of strings.`);
}
function validateCheck(check) {
	ensure(check && typeof check.id === "string" && ID_PATTERN.test(check.id), error, `Invalid check id: ${String(check?.id)}`);
	ensure(ROLES.has(check.role), error, `Unknown role of check ${check.id}: ${String(check.role)}`);
	ensure(STAGES.has(check.stage), error, `Unknown stage of check ${check.id}: ${String(check.stage)}`);
	ensure(typeof check.required === "boolean", error, `Check ${check.id} needs required: boolean.`);
	positiveInteger(check.timeoutMs, `checks.${check.id}.timeoutMs`, { max: MAX_TIMEOUT_MS });
	validateCommand(check);
	ensure(check.appliesTo === void 0 || Array.isArray(check.appliesTo) && check.appliesTo.every((glob) => typeof glob === "string" && glob !== ""), error, `appliesTo of ${check.id} must be a list of globs.`);
	const artifact = check.role === "package" || check.role === "installed";
	ensure(!artifact || typeof check.evidence === "string" && check.evidence.trim() !== "", error, `Check ${check.id} (${check.role}) needs evidence describing the artifact and scenario.`);
	ensure(check.stage !== "delivery" || artifact, error, `Only package or installed checks run at the delivery stage: ${check.id}`);
}
function validateConfig(config) {
	ensure(config && config.schema === "harness-workflow-config/1", error, "Unsupported workflow configuration schema.");
	const quality = config.quality;
	ensure(quality && (quality.status === "DISCOVERY" || quality.status === "CONFIGURED"), error, "quality.status must be DISCOVERY or CONFIGURED.");
	ensure(Array.isArray(quality.stacks) && quality.stacks.every((stack) => typeof stack === "string"), error, "quality.stacks must be a list.");
	ensure(quality.status === "DISCOVERY" || quality.stacks.length > 0, error, "A CONFIGURED profile names at least one stack.");
	ensure(Array.isArray(quality.checks), error, "quality.checks must be a list.");
	for (const check of quality.checks) validateCheck(check);
	ensure(new Set(quality.checks.map((check) => check.id)).size === quality.checks.length, error, "Check ids must be unique.");
	ensure(Array.isArray(config.docs?.contracts) && config.docs.contracts.every((item) => typeof item.code === "string" && Array.isArray(item.docs) && item.docs.length > 0), error, "docs.contracts must map code globs to documents.");
	ensure(config.policy && (config.policy.maxFileLines === null || Number.isSafeInteger(config.policy.maxFileLines)), error, "policy.maxFileLines must be an integer or null.");
	ensure(config.policy.taskFileSoftLimit === null || Number.isSafeInteger(config.policy.taskFileSoftLimit), error, "policy.taskFileSoftLimit must be an integer or null.");
	positiveInteger(config.budget?.documentBytes, "budget.documentBytes");
	positiveInteger(config.budget?.recoveryBytes, "budget.recoveryBytes", {
		max: MAX_RECOVERY_BYTES,
		min: MIN_RECOVERY_BYTES
	});
	positiveInteger(config.autopilot?.maxContinues, "autopilot.maxContinues", { max: 1e3 });
	return config;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-detect.ts
var STACK_ORDER = [
	"node",
	"python",
	"go",
	"rust",
	"dotnet",
	"swift",
	"jvm"
];
var MARKERS$1 = [
	{
		pattern: /^(package\.json|tsconfig\.json|deno\.jsonc?)$/u,
		stack: "node"
	},
	{
		pattern: /^(pyproject\.toml|setup\.py|requirements[^/]*\.txt)$/u,
		stack: "python"
	},
	{
		pattern: /^go\.mod$/u,
		stack: "go"
	},
	{
		pattern: /^Cargo\.toml$/u,
		stack: "rust"
	},
	{
		pattern: /^(global\.json|.+\.csproj|.+\.sln)$/u,
		stack: "dotnet"
	},
	{
		pattern: /^(Package\.swift|.+\.xcodeproj)$/u,
		stack: "swift"
	},
	{
		pattern: /^(pom\.xml|build\.gradle(\.kts)?)$/u,
		stack: "jvm"
	}
];
var LOCK_FILES = {
	"bun.lock": "bun",
	"bun.lockb": "bun",
	"package-lock.json": "npm",
	"pnpm-lock.yaml": "pnpm",
	"poetry.lock": "poetry",
	"uv.lock": "uv",
	"yarn.lock": "yarn"
};
var NODE_MANAGERS = /* @__PURE__ */ new Set([
	"npm",
	"pnpm",
	"yarn",
	"bun"
]);
var PYTHON_MANAGERS = /* @__PURE__ */ new Set(["uv", "poetry"]);
var DEFAULT_MANAGER = {
	dotnet: "dotnet",
	go: "go",
	jvm: "maven",
	node: "npm",
	python: "pip",
	rust: "cargo",
	swift: "swift"
};
var SKIPPED_DIRECTORIES = /* @__PURE__ */ new Set([
	"build",
	"dist",
	"node_modules",
	"out",
	"release",
	"target",
	"vendor",
	"venv"
]);
var PACKAGE_MANAGER_FIELD = /^(npm|pnpm|yarn|bun)@/u;
function entries(root, directory) {
	try {
		const listed = readdirSync(path.join(root, ...directory.split("/").filter((part) => part !== ".")), { withFileTypes: true });
		return {
			directories: listed.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
			files: listed.map((entry) => entry.name)
		};
	} catch {
		return {
			directories: [],
			files: []
		};
	}
}
function join(directory, name) {
	return directory === "." ? name : `${directory}/${name}`;
}
/** Reads a JSON manifest; malformed manifests count as empty. */
function readJsonManifest(root, relative) {
	const text = workflowPlatformFacade.readTextIfExists(path.join(root, ...relative.split("/")));
	if (text === null) return null;
	try {
		const value = JSON.parse(text);
		return value && typeof value === "object" ? value : null;
	} catch {
		return null;
	}
}
function nodeManager(root, directories, locks) {
	for (const directory of directories) {
		const lock = locks.get(directory);
		if (lock && NODE_MANAGERS.has(lock)) return lock;
	}
	for (const directory of directories) {
		const field = readJsonManifest(root, join(directory, "package.json"))?.packageManager;
		const match = typeof field === "string" ? PACKAGE_MANAGER_FIELD.exec(field) : null;
		if (match?.[1]) return match[1];
	}
	return DEFAULT_MANAGER.node;
}
function packageManagerOf(root, stack, directories, markers, locks) {
	if (stack === "node") return nodeManager(root, directories, locks);
	if (stack === "python") return directories.map((directory) => locks.get(directory)).find((value) => value && PYTHON_MANAGERS.has(value)) ?? DEFAULT_MANAGER.python;
	if (stack === "jvm") return markers.some((marker) => path.posix.basename(marker).startsWith("build.gradle")) ? "gradle" : "maven";
	return DEFAULT_MANAGER[stack];
}
/**
* Detects ecosystems from manifests in the project root and its first-level
* subdirectories. Hidden and build-output directories are skipped.
*/
function detectStacks(root) {
	const scanned = ["."];
	for (const name of entries(root, ".").directories.sort()) if (!(name.startsWith(".") || SKIPPED_DIRECTORIES.has(name))) scanned.push(name);
	const found = /* @__PURE__ */ new Map();
	const locks = /* @__PURE__ */ new Map();
	for (const directory of scanned) for (const name of entries(root, directory).files.sort()) {
		const lock = LOCK_FILES[name];
		if (lock && !locks.has(directory)) locks.set(directory, lock);
		const marker = MARKERS$1.find((candidate) => candidate.pattern.test(name));
		if (marker) {
			const current = found.get(marker.stack) ?? {
				directories: /* @__PURE__ */ new Set(),
				markers: []
			};
			current.directories.add(directory);
			current.markers.push(join(directory, name));
			found.set(marker.stack, current);
		}
	}
	return STACK_ORDER.flatMap((id) => {
		const current = found.get(id);
		if (!current) return [];
		const directories = [...current.directories];
		return [{
			directories,
			id,
			markers: current.markers,
			packageManager: packageManagerOf(root, id, directories, current.markers, locks)
		}];
	});
}
function recordOf(value) {
	return value && typeof value === "object" ? value : {};
}
/** Collects dependency and script names of the node manifests of a stack. */
function nodeManifest(root, directories) {
	const packages = /* @__PURE__ */ new Set();
	const scripts = /* @__PURE__ */ new Map();
	for (const directory of directories) {
		const manifest = recordOf(readJsonManifest(root, join(directory, "package.json")));
		for (const name of [...Object.keys(recordOf(manifest.dependencies)), ...Object.keys(recordOf(manifest.devDependencies))]) packages.add(name);
		const declared = directory === "." ? Object.entries(recordOf(manifest.scripts)) : [];
		for (const [name, command] of declared) if (typeof command === "string") scripts.set(name, command);
	}
	return {
		packages,
		scripts
	};
}
/** Text of the python manifests, used to recognise declared tools. */
function pythonManifestText(root, markers) {
	return markers.filter((marker) => !marker.endsWith("setup.py")).map((marker) => workflowPlatformFacade.readTextIfExists(path.join(root, ...marker.split("/"))) ?? "").join("\n").toLowerCase();
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-apply.ts
var INSTALL_TIMEOUT_MS = 900 * 1e3;
var MIN_APPROVAL = 10;
/** Builds the CONFIGURED configuration; builtin checks of `current` are kept. */
function configuredProfile(current, input) {
	ensure(input && Array.isArray(input.stacks) && input.stacks.length > 0, "PROFILE_INVALID", "The profile names at least one stack.");
	const unknown = input.stacks.filter((id) => !STACK_ORDER.includes(id));
	ensure(unknown.length === 0, "UNKNOWN_STACK", `Unknown stack: ${unknown.join(", ")}`);
	ensure(Array.isArray(input.checks), "PROFILE_INVALID", "The profile needs a checks list.");
	const builtins = current.quality.checks.filter((check) => check.builtin);
	const builtinIds = new Set(builtins.map((check) => check.id));
	const checks = input.checks.map((check) => {
		ensure(!builtinIds.has(check.id), "PROFILE_INVALID", `Check id ${check.id} is reserved for a Kit builtin.`);
		return normalizeCheck(check);
	});
	return validateConfig({
		...current,
		docs: input.docs ?? current.docs,
		policy: {
			...current.policy,
			...input.policy ?? {}
		},
		quality: {
			checks: [...checks, ...builtins],
			packageManager: input.packageManager ?? null,
			stacks: [...new Set(input.stacks)],
			status: "CONFIGURED"
		}
	});
}
/**
* Runs approved install commands in the project root. The first failure
* stops the sequence; nothing is rolled back because installs change files
* the user can inspect.
*/
function runInstalls(root, input, env) {
	const commands = input.install ?? [];
	if (commands.length === 0) return [];
	ensure(typeof input.approval === "string" && input.approval.trim().length >= MIN_APPROVAL, "INSTALL_APPROVAL", "Installing tools changes the project; record the user's approval in `approval` (at least 10 characters).");
	const results = [];
	for (const command of commands) {
		ensure(command && typeof command.executable === "string" && Array.isArray(command.args), "PROFILE_INVALID", "Each install command needs executable and args.");
		const started = Date.now();
		const outcome = workflowPlatformFacade.run({
			args: command.args,
			cwd: command.cwd ? workflowPlatformFacade.resolveInside(root, command.cwd) : root,
			env,
			executable: command.executable,
			timeoutMs: INSTALL_TIMEOUT_MS
		});
		const text = [command.executable, ...command.args].join(" ");
		const output = `${outcome.stdout}${outcome.stderr}`.slice(-4e3);
		if (outcome.status !== 0) throw new WorkflowError("INSTALL_FAILED", `Install command failed: ${text}`, {
			completed: results,
			output: outcome.errorMessage ?? output
		}, "Fix the install problem and repeat quality:apply; the profile was not changed.");
		results.push({
			command: text,
			durationMs: Date.now() - started,
			output
		});
	}
	return results;
}
/** Compares the profile stacks with the stacks detected in the project. */
function profileDrift(root, config) {
	if (config.quality.status === "DISCOVERY") return {
		added: [],
		missing: [],
		status: "discovery"
	};
	const detected = detectStacks(root).map((item) => item.id);
	const added = detected.filter((id) => !config.quality.stacks.includes(id));
	const missing = config.quality.stacks.filter((id) => !detected.includes(id));
	return {
		added,
		missing,
		status: added.length === 0 && missing.length === 0 ? "ok" : "drift"
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-globs.ts
var PLACEHOLDER_PATTERN = /\{([a-z]+)\}/gu;
var LEADING_PLACEHOLDER = /^\{([a-z]+)\}/u;
var SPECIAL_PATTERN = /[|\\{}()[\]^$+?.]/gu;
var compiled = /* @__PURE__ */ new Map();
function compile(pattern) {
	const cached = compiled.get(pattern);
	if (cached) return cached;
	const names = [];
	let source = "";
	let index = 0;
	while (index < pattern.length) {
		const rest = pattern.slice(index);
		const placeholder = LEADING_PLACEHOLDER.exec(rest);
		if (placeholder?.[1]) {
			names.push(placeholder[1]);
			source += "([^/]+)";
			index += placeholder[0].length;
		} else if (rest.startsWith("**/")) {
			source += "(?:.*/)?";
			index += 3;
		} else if (rest.startsWith("**")) {
			source += ".*";
			index += 2;
		} else if (rest.startsWith("*")) {
			source += "[^/]*";
			index += 1;
		} else {
			source += (pattern[index] ?? "").replace(SPECIAL_PATTERN, "\\$&");
			index += 1;
		}
	}
	const result = {
		names,
		regex: new RegExp(`^${source}$`, "u")
	};
	compiled.set(pattern, result);
	return result;
}
/**
* Matches a canonical path against a glob with `*`, `**` and `{name}`
* captures (one path segment each). Returns the captures, or null.
*/
function matchGlob(pattern, value) {
	const { names, regex } = compile(pattern);
	const match = regex.exec(value);
	if (!match) return null;
	return Object.fromEntries(names.map((name, index) => [name, match[index + 1] ?? ""]));
}
function matchesAny(patterns, value) {
	return patterns.some((pattern) => matchGlob(pattern, value) !== null);
}
function fillPlaceholders(template, values) {
	return template.replace(PLACEHOLDER_PATTERN, (whole, name) => values[name] ?? whole);
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts
var MARKDOWN_LINK = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/gu;
var FENCE = /^\s*(```|~~~)/u;
var EXTERNAL_LINK = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/iu;
var NUL = "\0";
function absolute(root, file) {
	return path.join(root, ...file.split("/"));
}
function existingFile(root, file) {
	const target = absolute(root, file);
	return existsSync(target) && statSync(target).isFile();
}
function changedMarkdown(context) {
	return context.files.filter((file) => isDocumentationPath(file) && file !== ".harness/plans/todo-plan.md" && existingFile(context.root, file));
}
function fileLines(context) {
	const limit = context.config.policy.maxFileLines;
	if (limit === null) return {
		output: "policy.maxFileLines is not set.",
		passed: true
	};
	const over = [];
	for (const file of context.files) {
		if (isDocumentationPath(file) || file.startsWith(".harness/") || !existingFile(context.root, file)) continue;
		const text = readFileSync(absolute(context.root, file), "utf8");
		if (text.includes(NUL)) continue;
		const lines = text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
		if (lines > limit) over.push(`${file}: ${lines} lines (limit ${limit})`);
	}
	return over.length === 0 ? {
		output: `File line limit ${limit}: OK.`,
		passed: true
	} : {
		output: over.join("\n"),
		passed: false
	};
}
function docSize(context) {
	const limit = context.config.budget.documentBytes;
	const over = changedMarkdown(context).flatMap((file) => {
		const size = statSync(absolute(context.root, file)).size;
		return size > limit ? [`${file}: ${size} bytes (limit ${limit}); split the document.`] : [];
	});
	return over.length === 0 ? {
		output: `Document size limit ${limit}: OK.`,
		passed: true
	} : {
		output: over.join("\n"),
		passed: false
	};
}
function linkTargets(text) {
	const targets = [];
	let fenced = false;
	for (const line of text.split("\n")) {
		if (FENCE.test(line)) {
			fenced = !fenced;
			continue;
		}
		if (fenced) continue;
		for (const match of line.matchAll(MARKDOWN_LINK)) if (match[1]) targets.push(match[1]);
	}
	return targets;
}
function brokenLinks(root, file) {
	const directory = path.dirname(absolute(root, file));
	const broken = [];
	for (const target of linkTargets(readFileSync(absolute(root, file), "utf8"))) {
		if (EXTERNAL_LINK.test(target)) continue;
		const clean = target.split("#")[0]?.split("?")[0] ?? "";
		let decoded = clean;
		try {
			decoded = decodeURIComponent(clean);
		} catch {}
		if (decoded === "") continue;
		const resolved = decoded.startsWith("/") ? path.join(root, decoded) : path.resolve(directory, decoded);
		if (!(!path.relative(root, resolved).startsWith("..") && existsSync(resolved))) broken.push(`${file}: ${target}`);
	}
	return broken;
}
function mdLinks(context) {
	const broken = changedMarkdown(context).flatMap((file) => brokenLinks(context.root, file));
	return broken.length === 0 ? {
		output: "Markdown links: OK.",
		passed: true
	} : {
		output: `Broken relative links:\n${broken.join("\n")}`,
		passed: false
	};
}
/** Lists code files whose contract documents are absent from the candidate. */
function missingContracts(config, files) {
	const candidate = new Set(files);
	const missing = [];
	for (const file of files) for (const contract of config.docs.contracts) {
		const captures = matchGlob(contract.code, file);
		if (!captures) continue;
		const documents = contract.docs.map((doc) => fillPlaceholders(doc, captures));
		if (!documents.some((doc) => candidate.has(doc))) missing.push(`${file} -> ${documents.join(" | ")}`);
	}
	return [...new Set(missing)];
}
function docsContracts(context) {
	const missing = missingContracts(context.config, context.files);
	if (missing.length === 0) return {
		output: "Documentation contracts: OK.",
		passed: true
	};
	if (context.docsWaiver) return {
		output: `Documentation contracts waived: ${context.docsWaiver}\n${missing.join("\n")}`,
		passed: true
	};
	return {
		output: `Code changed without its contract document. Update the document in the same commit or record a docsWaiver.\n${missing.join("\n")}`,
		passed: false
	};
}
var BUILTIN_CHECKS = {
	"kit:doc-size": docSize,
	"kit:docs-contracts": docsContracts,
	"kit:file-lines": fileLines,
	"kit:md-links": mdLinks
};
/** Builtins that run for service commits (documentation only). */
var DOCUMENTATION_BUILTINS = /* @__PURE__ */ new Set([
	"kit:doc-size",
	"kit:md-links",
	"kit:docs-contracts"
]);
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-catalog.ts
var ROLE_ORDER = [
	"format",
	"lint",
	"typecheck",
	"test",
	"audit"
];
var ROLE_STAGE = {
	audit: "push",
	format: "prepare",
	lint: "commit",
	test: "commit",
	typecheck: "commit"
};
/** Package scripts that already implement a role in a node project. */
var NODE_ROLE_SCRIPTS = {
	lint: ["lint"],
	test: ["test"],
	typecheck: ["typecheck", "type-check"]
};
var tool = (name, args, packages = [], extra = {}) => ({
	args,
	packages,
	tool: name,
	...extra
});
var CATALOG = {
	dotnet: {
		audit: [tool("dotnet", [
			"list",
			"package",
			"--vulnerable"
		])],
		format: [tool("dotnet", [
			"format",
			"--include",
			"{files}"
		], [], { appliesTo: ["**/*.cs"] })],
		lint: [tool("dotnet", ["build", "-warnaserror"])],
		test: [tool("dotnet", ["test"])]
	},
	go: {
		audit: [tool("govulncheck", ["./..."], [], { install: {
			args: ["install", "golang.org/x/vuln/cmd/govulncheck@latest"],
			executable: "go"
		} })],
		format: [tool("gofmt", ["-w", "{files}"], [], { appliesTo: ["**/*.go"] })],
		lint: [tool("go", ["vet", "./..."])],
		test: [tool("go", ["test", "./..."])]
	},
	jvm: { test: [tool("gradle", ["test"]), tool("mvn", ["-q", "test"])] },
	node: {
		audit: [tool("audit", [])],
		format: [
			tool("ultracite", ["fix", "{files}"], ["ultracite"]),
			tool("biome", [
				"format",
				"--write",
				"{files}"
			], ["@biomejs/biome"]),
			tool("prettier", [
				"--write",
				"--ignore-unknown",
				"{files}"
			], ["prettier"])
		],
		lint: [
			tool("ultracite", ["check"], ["ultracite"]),
			tool("biome", ["check"], ["@biomejs/biome"]),
			tool("eslint", ["."], ["eslint"])
		],
		test: [
			tool("vitest", ["run"], ["vitest"]),
			tool("jest", [], ["jest"]),
			tool("node", ["--test"])
		],
		typecheck: [tool("tsc", ["--noEmit"], ["typescript"], { needs: "tsconfig.json" })]
	},
	python: {
		audit: [tool("pip-audit", [], ["pip-audit"], { module: "pip_audit" })],
		format: [tool("ruff", ["format", "{files}"], ["ruff"], { appliesTo: ["**/*.py"] })],
		lint: [tool("ruff", ["check"], ["ruff"])],
		test: [tool("pytest", [], ["pytest"])],
		typecheck: [tool("pyright", [], ["pyright"]), tool("mypy", ["."], ["mypy"])]
	},
	rust: {
		audit: [tool("cargo-audit", ["audit"], [], { install: {
			args: ["install", "cargo-audit"],
			executable: "cargo"
		} })],
		format: [tool("cargo", [
			"fmt",
			"--",
			"{files}"
		], [], { appliesTo: ["**/*.rs"] })],
		lint: [tool("cargo", [
			"clippy",
			"--all-targets",
			"--",
			"-D",
			"warnings"
		])],
		test: [tool("cargo", ["test"])],
		typecheck: [tool("cargo", ["check"])]
	},
	swift: {
		format: [tool("swift-format", [
			"format",
			"-i",
			"{files}"
		], [], { appliesTo: ["**/*.swift"] })],
		lint: [tool("swiftlint", [])],
		test: [tool("swift", ["test"])]
	}
};
/** Command that runs a node package binary through the package manager. */
function nodeCommand(manager, bin, args) {
	if (bin === "node") return {
		args,
		executable: "node"
	};
	switch (manager) {
		case "pnpm": return {
			args: [
				"exec",
				bin,
				...args
			],
			executable: "pnpm"
		};
		case "yarn": return {
			args: [bin, ...args],
			executable: "yarn"
		};
		case "bun": return {
			args: [bin, ...args],
			executable: "bunx"
		};
		default: return {
			args: [bin, ...args],
			executable: "npx"
		};
	}
}
function nodeScriptCommand(manager, script) {
	if (manager === "npm") return script === "test" ? {
		args: ["test"],
		executable: "npm"
	} : {
		args: [
			"run",
			"-s",
			script
		],
		executable: "npm"
	};
	return {
		args: ["run", script],
		executable: manager
	};
}
function nodeAuditCommand(manager) {
	if (manager === "npm" || manager === "pnpm" || manager === "yarn") return {
		args: ["audit", ...manager === "npm" ? ["--audit-level=high"] : []],
		executable: manager
	};
	return null;
}
function nodeInstallCommand(manager, packages) {
	return {
		args: [...{
			bun: ["add", "-d"],
			pnpm: ["add", "-D"],
			yarn: ["add", "-D"]
		}[manager] ?? ["install", "-D"], ...packages],
		executable: manager
	};
}
function pythonCommand(manager, spec) {
	if (manager === "uv" || manager === "poetry") return {
		args: [
			"run",
			spec.tool,
			...spec.args
		],
		executable: manager
	};
	return {
		args: [
			"-m",
			spec.module ?? spec.tool,
			...spec.args
		],
		executable: "python"
	};
}
function pythonInstallCommand(manager, packages) {
	if (manager === "uv") return {
		args: [
			"add",
			"--dev",
			...packages
		],
		executable: "uv"
	};
	if (manager === "poetry") return {
		args: [
			"add",
			"--group",
			"dev",
			...packages
		],
		executable: "poetry"
	};
	return {
		args: [
			"-m",
			"pip",
			"install",
			...packages
		],
		executable: "python"
	};
}
function checkFor(id, role, command, appliesTo) {
	return {
		...appliesTo ? { appliesTo } : {},
		command,
		id,
		required: true,
		role,
		stage: ROLE_STAGE[role],
		...role === "test" ? { timeoutMs: 6e5 } : {}
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-proposal.ts
var ROLE_ID = {
	audit: "audit",
	format: "format",
	lint: "lint",
	test: "tests",
	typecheck: "typecheck"
};
var NPM_TEST_PLACEHOLDER = "no test specified";
var TOKEN_SEPARATOR = /[^a-z0-9_.-]+/u;
function pick(candidates, installed) {
	const ready = candidates.find(installed);
	const chosen = ready ?? candidates[0];
	return chosen ? {
		chosen,
		ready: Boolean(ready)
	} : null;
}
function nodeSelection(root, detection, role) {
	const manager = detection.packageManager;
	const { packages, scripts } = nodeManifest(root, detection.directories);
	const candidates = CATALOG.node[role] ?? [];
	const alternatives = candidates.map((spec) => spec.tool);
	const script = (NODE_ROLE_SCRIPTS[role] ?? []).find((name) => scripts.has(name) && !(scripts.get(name) ?? "").includes(NPM_TEST_PLACEHOLDER));
	if (script) return {
		alternatives,
		command: nodeScriptCommand(manager, script),
		installed: true,
		spec: null
	};
	if (role === "audit") {
		const command = nodeAuditCommand(manager);
		return command ? {
			alternatives: [],
			command,
			installed: true,
			spec: null
		} : null;
	}
	const typed = detection.markers.some((marker) => marker.endsWith("tsconfig.json")) || packages.has("typescript");
	const choice = pick(candidates.filter((spec) => spec.needs !== "tsconfig.json" || typed), (spec) => spec.packages.every((name) => packages.has(name)));
	if (!choice) return null;
	const bin = choice.chosen.tool;
	return {
		alternatives,
		command: nodeCommand(manager, bin, choice.chosen.args),
		installed: choice.ready,
		spec: choice.chosen
	};
}
function pythonSelection(root, detection, role) {
	const tokens = new Set(pythonManifestText(root, detection.markers).split(TOKEN_SEPARATOR));
	const candidates = CATALOG.python[role] ?? [];
	const choice = pick(candidates, (spec) => spec.packages.every((name) => tokens.has(name)));
	if (!choice) return null;
	return {
		alternatives: candidates.map((spec) => spec.tool),
		command: pythonCommand(detection.packageManager, choice.chosen),
		installed: choice.ready,
		spec: choice.chosen
	};
}
function toolchainSelection(detection, role, which) {
	let candidates = CATALOG[detection.id][role] ?? [];
	if (detection.id === "jvm") candidates = candidates.filter((spec) => spec.tool === (detection.packageManager === "gradle" ? "gradle" : "mvn"));
	const choice = pick(candidates, (spec) => which(spec.tool));
	if (!choice) return null;
	const executable = choice.chosen.tool === "cargo-audit" ? "cargo" : choice.chosen.tool;
	return {
		alternatives: candidates.map((spec) => spec.tool),
		command: {
			args: choice.chosen.args,
			executable
		},
		installed: choice.ready,
		spec: choice.chosen
	};
}
function planStack(root, detection, options, idOf, checks) {
	const plan = {
		entries: [],
		installs: [],
		notes: []
	};
	const missingPackages = /* @__PURE__ */ new Set();
	for (const role of ROLE_ORDER) {
		let selection;
		if (detection.id === "node") selection = nodeSelection(root, detection, role);
		else if (detection.id === "python") selection = pythonSelection(root, detection, role);
		else selection = toolchainSelection(detection, role, options.which);
		if (!selection) continue;
		const id = idOf(role);
		checks.push(checkFor(id, role, selection.command, selection.spec?.appliesTo));
		const toolName = selection.spec?.tool ?? `${selection.command.executable} ${selection.command.args.join(" ")}`;
		plan.entries.push({
			alternatives: selection.alternatives,
			id,
			installed: selection.installed,
			role,
			stack: detection.id,
			tool: toolName
		});
		if (selection.installed || !selection.spec) continue;
		if (selection.spec.install) plan.installs.push(selection.spec.install);
		else if (selection.spec.packages.length > 0) for (const name of selection.spec.packages) missingPackages.add(name);
		else plan.notes.push(`${detection.id}: install ${selection.spec.tool} manually; it is not on PATH.`);
	}
	if (missingPackages.size > 0) {
		const names = [...missingPackages];
		plan.installs.unshift(detection.id === "node" ? nodeInstallCommand(detection.packageManager, names) : pythonInstallCommand(detection.packageManager, names));
	}
	return plan;
}
function fallbackDetection(id) {
	return {
		directories: ["."],
		id,
		markers: [],
		packageManager: {
			dotnet: "dotnet",
			go: "go",
			jvm: "maven",
			node: "npm",
			python: "pip",
			rust: "cargo",
			swift: "swift"
		}[id]
	};
}
/** Detects stacks and proposes catalog checks with install commands. */
function proposeQuality(root, options) {
	const detected = detectStacks(root);
	const stacks = (options.stacks ? STACK_ORDER.filter((id) => options.stacks?.includes(id)) : detected.map((item) => item.id)).map((id) => detected.find((item) => item.id === id) ?? fallbackDetection(id));
	const checks = [];
	const entries = [];
	const install = [];
	const notes = [];
	for (const detection of stacks) {
		const idOf = (role) => stacks.length === 1 ? ROLE_ID[role] : `${detection.id}-${ROLE_ID[role]}`;
		const plan = planStack(root, detection, options, idOf, checks);
		entries.push(...plan.entries);
		install.push(...plan.installs);
		notes.push(...plan.notes);
	}
	if (stacks.length === 0) notes.push("No stack detected; pass the stack explicitly from the architecture document.");
	notes.push("Kit builtins (kit:doc-size, kit:md-links, kit:file-lines, kit:docs-contracts) are always kept.");
	return {
		detected,
		entries,
		notes,
		profile: {
			checks,
			install,
			packageManager: stacks[0]?.packageManager ?? null,
			stacks: stacks.map((item) => item.id)
		}
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-runner.ts
var OUTPUT_TAIL = 4e3;
var FILES_ARGUMENT = "{files}";
function tail(text) {
	return text.length > OUTPUT_TAIL ? `…${text.slice(-4e3)}` : text;
}
function unknownChecks(config, ids) {
	const known = new Set(config.quality.checks.map((check) => check.id));
	const unknown = ids.filter((id) => !known.has(id));
	ensure(unknown.length === 0, "CHECK_UNKNOWN", `Unknown checks: ${unknown.join(", ")}`, { checks: unknown });
}
/** Checks a stage runs, in configuration order. */
function selectChecks(request) {
	const { config, stage } = request;
	if (request.only) {
		unknownChecks(config, request.only);
		return config.quality.checks.filter((check) => request.only?.includes(check.id));
	}
	if (request.service) return stage === "commit" ? config.quality.checks.filter((check) => check.builtin && DOCUMENTATION_BUILTINS.has(check.builtin)) : [];
	const assigned = request.assigned ?? [];
	unknownChecks(config, assigned);
	return config.quality.checks.filter((check) => check.stage === stage && (check.required || assigned.includes(check.id)));
}
function result(check, fields) {
	return {
		command: check.builtin ?? [check.command?.executable ?? "", ...check.command?.args ?? []].join(" "),
		durationMs: 0,
		evidence: check.evidence ?? null,
		exitCode: null,
		id: check.id,
		output: "",
		reason: null,
		role: check.role,
		stage: check.stage,
		...fields
	};
}
function isExistingFile(root, file) {
	const target = path.join(root, ...file.split("/"));
	return existsSync(target) && statSync(target).isFile();
}
function runCommand(check, request, files) {
	const command = check.command;
	if (!command) return result(check, {
		reason: "The check has no command.",
		status: "error"
	});
	const usesFiles = command.args.includes(FILES_ARGUMENT);
	const existing = (files ?? []).filter((file) => isExistingFile(request.root, file));
	if (usesFiles && existing.length === 0) return result(check, {
		reason: "No existing files to pass.",
		status: "skipped"
	});
	const args = command.args.flatMap((arg) => arg === FILES_ARGUMENT ? existing : [arg]);
	const executable = (command.executable.includes("/") || command.executable.includes("\\")) && !path.isAbsolute(command.executable) ? workflowPlatformFacade.resolveInside(request.root, command.executable) : command.executable;
	const cwd = command.cwd ? workflowPlatformFacade.resolveInside(request.root, command.cwd) : request.root;
	const started = Date.now();
	const outcome = workflowPlatformFacade.run({
		args,
		cwd,
		env: request.env ?? process.env,
		executable,
		timeoutMs: check.timeoutMs
	});
	const output = tail(`${outcome.stdout}${outcome.stderr}`);
	const durationMs = Date.now() - started;
	if (outcome.timedOut) return result(check, {
		durationMs,
		output,
		reason: `Timed out after ${check.timeoutMs} ms.`,
		status: "timeout"
	});
	if (outcome.status === null) return result(check, {
		durationMs,
		output,
		reason: outcome.errorMessage ?? `${command.executable} did not start.`,
		status: "error"
	});
	return result(check, {
		durationMs,
		exitCode: outcome.status,
		output,
		status: outcome.status === 0 ? "passed" : "failed"
	});
}
function runOne(check, request) {
	const filtered = request.files && check.appliesTo ? request.files.filter((file) => matchesAny(check.appliesTo ?? [], file)) : request.files;
	if (request.files && check.appliesTo && filtered?.length === 0) return result(check, {
		reason: "No candidate file matches appliesTo.",
		status: "skipped"
	});
	if (check.builtin) {
		const started = Date.now();
		const outcome = BUILTIN_CHECKS[check.builtin]({
			config: request.config,
			docsWaiver: request.docsWaiver ?? null,
			files: filtered ?? [],
			root: request.root
		});
		return result(check, {
			durationMs: Date.now() - started,
			output: tail(outcome.output),
			status: outcome.passed ? "passed" : "failed"
		});
	}
	return runCommand(check, request, filtered);
}
/** Runs the checks of one stage without a shell and reports every result. */
function runStage(request) {
	const startedAt = (/* @__PURE__ */ new Date()).toISOString();
	const results = selectChecks(request).map((check) => runOne(check, request));
	return {
		finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
		ok: results.every((item) => item.status === "passed" || item.status === "skipped"),
		results,
		stage: request.stage,
		startedAt
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts
/** Public facade of the workflow-quality module: configuration, detection and checks. */
var WorkflowQualityFacade = class {
	configPath = CONFIG_PATH;
	defaultConfig() {
		return defaultConfig();
	}
	validateConfig(config) {
		return validateConfig(config);
	}
	normalizeCheck(input) {
		const check = normalizeCheck(input);
		validateCheck(check);
		return check;
	}
	configFile(root) {
		return path.join(root, ...CONFIG_PATH.split("/"));
	}
	/** Reads the project configuration; a missing file means the default DISCOVERY profile. */
	readConfig(root) {
		const text = workflowPlatformFacade.readTextIfExists(this.configFile(root));
		if (text === null) return defaultConfig();
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch (cause) {
			throw new WorkflowError("CONFIG_JSON", `${CONFIG_PATH} is not valid JSON: ${cause.message}`);
		}
		return validateConfig(parsed);
	}
	renderConfig(config) {
		return `${JSON.stringify(validateConfig(config), null, 2)}\n`;
	}
	/** Ecosystems recognised by detection and the catalog, in priority order. */
	stacks() {
		return STACK_ORDER;
	}
	detect(root) {
		return detectStacks(root);
	}
	/**
	* Proposes a quality profile from detection and the catalog. `stacks`
	* overrides detection; `which` defaults to a PATH lookup.
	*/
	propose(root, options = {}) {
		const unknown = (options.stacks ?? []).filter((id) => !STACK_ORDER.includes(id));
		ensure(unknown.length === 0, "UNKNOWN_STACK", `Unknown stack: ${unknown.join(", ")}. Known: ${STACK_ORDER.join(", ")}.`);
		return proposeQuality(root, {
			stacks: options.stacks,
			which: options.which ?? ((name) => workflowPlatformFacade.findExecutable(name) !== null)
		});
	}
	/** Checks a stage would run, without running them. */
	selectChecks(request) {
		return selectChecks(request);
	}
	runStage(request) {
		return runStage(request);
	}
	/** Code files of the candidate whose contract documents are missing. */
	missingContracts(config, files) {
		return missingContracts(config, files);
	}
	/**
	* Stores stage reports of a commit transaction. The git module renames the
	* pending record to `<sha>.json` and `last.json` once the commit exists.
	*/
	recordEvidence(root, transactionId, reports) {
		const file = workflowGitFacade.localPath(root, "verification", `pending-${transactionId}.json`);
		workflowPlatformFacade.writeFileAtomic(file, `${JSON.stringify({
			reports,
			transaction: transactionId
		}, null, 2)}\n`);
		return file;
	}
	/** Reads stored evidence by commit SHA, or the latest one. */
	readEvidence(root, reference = "last") {
		const text = workflowPlatformFacade.readTextIfExists(workflowGitFacade.localPath(root, "verification", `${reference}.json`));
		return text === null ? null : JSON.parse(text);
	}
	/** The configuration `apply` would write, without installing anything. */
	previewProfile(root, input) {
		return configuredProfile(this.readConfig(root), input);
	}
	/**
	* `quality:apply`: validates the profile, runs approved install commands
	* and writes the CONFIGURED configuration. The `quality` commit is made
	* by the Workflow Kit facade.
	*/
	applyProfile(root, input, env = process.env) {
		const config = this.previewProfile(root, input);
		const installs = runInstalls(root, input, env);
		this.writeConfig(root, config);
		return {
			config,
			installs
		};
	}
	drift(root, config = this.readConfig(root)) {
		return profileDrift(root, config);
	}
	writeConfig(root, config) {
		workflowPlatformFacade.writeFileAtomic(this.configFile(root), this.renderConfig(config));
	}
};
var workflowQualityFacade = new WorkflowQualityFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-provider-hooks.ts
var KIT_LAUNCHER_MARK = "scripts/workflow";
var KIT_HOOK_MARK = "hook session-start";
/** The SessionStart command a provider runs in the project directory. */
function sessionStartCommand(client) {
	return client === "claude" ? `"$CLAUDE_PROJECT_DIR/scripts/workflow" hook session-start --client claude` : "scripts/workflow hook session-start --client codex";
}
function kitGroup(client) {
	return { hooks: [{
		command: sessionStartCommand(client),
		type: "command"
	}] };
}
function isKitGroup(group) {
	const hooks = group?.hooks;
	return Array.isArray(hooks) && hooks.some((hook) => typeof hook?.command === "string" && hook.command.includes(KIT_LAUNCHER_MARK) && hook.command.includes(KIT_HOOK_MARK));
}
function parseObject(current, file) {
	if (current === null || current.trim() === "") return {};
	let parsed;
	try {
		parsed = JSON.parse(current);
	} catch {
		parsed = null;
	}
	ensure(parsed && typeof parsed === "object" && !Array.isArray(parsed), "MANAGED_JSON", `${file} is not a JSON object; fix it by hand first.`, { path: file });
	return parsed;
}
/**
* Adds or replaces the Kit SessionStart entry and keeps every other hook and
* setting of the file.
*/
function mergeSessionStartHook(current, client, file) {
	const settings = parseObject(current, file);
	const hooks = settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {};
	const existing = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
	const merged = {
		...settings,
		hooks: {
			...hooks,
			SessionStart: [...existing.filter((group) => !isKitGroup(group)), kitGroup(client)]
		}
	};
	return `${JSON.stringify(merged, null, 2)}\n`;
}
/** The Kit entry of a provider settings file, normalized, or null. */
function extractSessionStartHook(current) {
	try {
		const group = (JSON.parse(current ?? "").hooks?.SessionStart ?? []).find(isKitGroup);
		return group ? JSON.stringify(group) : null;
	} catch {
		return null;
	}
}
function expectedSessionStartHook(client) {
	return JSON.stringify(kitGroup(client));
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-sections.ts
var MARKERS = {
	hash: {
		begin: "# workflow-kit:begin",
		end: "# workflow-kit:end"
	},
	html: {
		begin: "<!-- workflow-kit:begin -->",
		end: "<!-- workflow-kit:end -->"
	}
};
var SHEBANG = /^#![^\n]*\n/u;
var CRLF = /\r\n/gu;
var LF = /\n/gu;
function eolOf(text) {
	return text.includes("\r\n") ? "\r\n" : "\n";
}
/** The managed block with its markers, using `\n` line ends. */
function sectionBlock(style, body) {
	const { begin, end } = MARKERS[style];
	return `${begin}\n${body.trimEnd()}\n${end}\n`;
}
function bounds(text, style) {
	const { begin, end } = MARKERS[style];
	const start = text.indexOf(begin);
	const stop = start === -1 ? -1 : text.indexOf(end, start);
	if (start === -1 || stop === -1) return null;
	let after = stop + end.length;
	if (text.startsWith("\r\n", after)) after += 2;
	else if (text.startsWith("\n", after)) after += 1;
	return {
		end: after,
		start
	};
}
/** The current managed block (markers included, `\n` line ends), or null. */
function extractSection(text, style) {
	const found = bounds(text, style);
	return found ? text.slice(found.start, found.end).replace(CRLF, "\n") : null;
}
/**
* Replaces or inserts the managed block. Text outside it is kept byte for
* byte; a new block goes to the end, or after the shebang for `top`.
*/
function upsertSection(current, style, body, placement = "bottom") {
	const text = current ?? "";
	const eol = eolOf(text);
	const block = sectionBlock(style, body).replace(LF, eol);
	const found = bounds(text, style);
	if (found) return `${text.slice(0, found.start)}${block}${text.slice(found.end)}`;
	if (placement === "top") {
		const shebang = SHEBANG.exec(text)?.[0] ?? "";
		return `${shebang}${block}${text.slice(shebang.length)}`;
	}
	if (text === "") return block;
	return `${text}${text.endsWith("\n") ? eol : `${eol}${eol}`}${block}`;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts
/** English process rules for agents: the managed section of AGENTS.md. */
function agentRules() {
	return `## Workflow Kit (managed section — do not edit by hand)

This project uses the Harness Workflow Kit. The plan lives in
\`.harness/plans/todo-plan.md\` and changes only through \`scripts/workflow\`
commands (Windows: \`scripts\\workflow.cmd\`). Every command prints JSON;
add \`--format text\` for a readable answer.

### Start of every session
1. Unless a workflow recovery packet is already in your context, run
   \`scripts/workflow recover --format text\`.
2. Follow the \`next\` line of the packet.

### When a plan is needed
- Discussion, research, specifications and documentation-only commits need
  no plan. Commit documents with \`scripts/workflow docs:commit --files <paths>\`.
- Changing functional files is allowed only inside a started task of the
  active scope.
- A clear user instruction to implement allows you to write the
  specification and create the scope with
  \`scripts/workflow scope:create --input <file.json>\` without asking again.
  Record the agreement in \`approval\`. The plan never replaces the user's
  current instruction.

### One task, one commit, one turn
1. \`scripts/workflow task:start <ID>\`; a delivery task needs
   \`--confirmed "<the user's confirmation>"\`.
2. Implement the task within its files and acceptance criteria.
3. \`scripts/workflow commit --task <ID>\`. The DOCS task of a round
   reconciles shared documents and needs \`--digest <file.json>\`
   (\`result\`, \`decisions\`, \`contracts\`, \`references\`).
4. If a check fails, fix the cause and repeat the same command; your edits
   are kept.
5. Report the result briefly and end the turn. The user or the Harness
   autopilot starts the next task.
- If the task cannot be finished in this turn, stop at a safe point, name
  the state and end the turn without committing it.
- A new user message does not cancel the accepted instruction; take it into
  account within the current task.

### Rules
- Never commit with \`git commit\` directly and never use \`--no-verify\`.
- Never edit the plan, \`.harness/workflow/**\` or the launchers by hand.
- A finished task never changes. Defects found later become a fixes round:
  \`scripts/workflow plan:extend --input <file.json> --expected-revision <N>\`.
- Before the first functional code, the QUALITY task chooses checks with
  \`quality:detect\` and applies them with \`quality:apply --input <file.json>\`.
  Installing tools needs the user's approval in \`approval\`.
- Update the contract document of a module in the same commit as its code
  (\`docs.contracts\` in \`.harness/workflow/config.json\`).
- Acceptance (\`accept --note "<the user's words>"\`) records the user's
  decision. Closing the scope (\`close\`) needs a separate direct user command.
- Build, packaging, publishing and push happen only in delivery tasks.
- If the scope is BLOCKED, only discuss and diagnose; run \`task:unblock\`
  after the user resolves the reason.
- If a command reports an unfinished transaction, run
  \`scripts/workflow repair\` and follow it.
- Use \`scripts/workflow show-task <ID>\` and \`scripts/workflow history\` for
  details the recovery packet left out.`;
}
var CLAUDE_IMPORT_LINE = "@AGENTS.md";
function gitignoreSection() {
	return [
		"# Workflow Kit local state",
		".harness/workflow/local/",
		".harness/runtime/"
	].join("\n");
}
function gitattributesSection() {
	return [
		"scripts/workflow text eol=lf",
		"scripts/workflow.cmd text eol=crlf",
		"scripts/workflow.ps1 text eol=crlf",
		".harness/** text eol=lf"
	].join("\n");
}
/** The managed lines of a git hook: delegate to the Kit and stop on failure. */
function gitHookSection(name) {
	return `"$(git rev-parse --show-toplevel)/scripts/workflow" git-hook ${name} "$@" || exit $?`;
}
function readmeSkeleton(projectName) {
	return `# ${projectName}

Project context for people and agents. Describe what the project does, how
to run it and where its architecture is documented
([docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md)).

Development follows the Workflow Kit rules in [AGENTS.md](AGENTS.md).
`;
}
function overviewSkeleton(projectName) {
	return `# ${projectName} — Architecture Overview

Describe the main parts of the system, their responsibilities and the
contracts between them. The DOCS task of every round keeps this document
in line with the code.
`;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts
/** Version of the Workflow Kit payload; Kit 1.x was Workflow Pilot. */
var KIT_VERSION = "2.0.0";
var MANIFEST_PATH = ".harness/workflow/manifest.json";
var MANIFEST_SCHEMA = "harness-workflow-manifest/1";
var OWN_HOOKS_DIR = ".harness/workflow/hooks";
var MANAGED_GIT_HOOKS = [
	"pre-commit",
	"commit-msg",
	"post-commit",
	"pre-push"
];
var LINE_BREAK$1 = /\r?\n/u;
function sha256(text) {
	return createHash("sha256").update(text, "utf8").digest("hex");
}
function hasClaudeLine(text) {
	return text.split(LINE_BREAK$1).some((line) => line.trim() === CLAUDE_IMPORT_LINE);
}
/** The managed part of a file of the given kind, or null when missing. */
function readManaged(kind, path, current) {
	if (current === null) return null;
	switch (kind) {
		case "owned": return current;
		case "section": return extractSection(current, path.endsWith(".md") ? "html" : "hash");
		case "json": return extractSessionStartHook(current);
		case "line": return hasClaudeLine(current) ? CLAUDE_IMPORT_LINE : null;
		default: return null;
	}
}
function owned(path, content, executable = false) {
	return {
		executable,
		kind: "owned",
		managed: content,
		path,
		read: (current) => current,
		render: () => content
	};
}
function section(path, style, body, placement = "bottom", prefix = "") {
	return {
		executable: false,
		kind: "section",
		managed: sectionBlock(style, body),
		path,
		read: (current) => current === null ? null : extractSection(current, style),
		render: (current) => upsertSection(current ?? (prefix || null), style, body, placement)
	};
}
function created(path, content) {
	return {
		executable: false,
		kind: "create",
		managed: null,
		path,
		read: () => null,
		render: (current) => current ?? content
	};
}
function claudeLine() {
	return {
		executable: false,
		kind: "line",
		managed: CLAUDE_IMPORT_LINE,
		path: "CLAUDE.md",
		read: (current) => readManaged("line", "CLAUDE.md", current),
		render: (current) => {
			if (current === null || current.trim() === "") return `${CLAUDE_IMPORT_LINE}\n`;
			if (hasClaudeLine(current)) return current;
			return `${current}${current.endsWith("\n") ? "" : "\n"}\n${CLAUDE_IMPORT_LINE}\n`;
		}
	};
}
function providerHook(path, client) {
	return {
		executable: false,
		kind: "json",
		managed: expectedSessionStartHook(client),
		path,
		read: (current) => readManaged("json", path, current),
		render: (current) => mergeSessionStartHook(current, client, path)
	};
}
function hookEntries(hooksPath) {
	return MANAGED_GIT_HOOKS.map((name) => {
		if (hooksPath === null) {
			const content = `#!/bin/sh\n# Managed by Harness Workflow Kit. Do not edit.\n${sectionBlock("hash", gitHookSection(name))}`;
			return owned(`${OWN_HOOKS_DIR}/${name}`, content, true);
		}
		return {
			...section(`${hooksPath}/${name}`, "hash", gitHookSection(name), "top", "#!/bin/sh\n"),
			executable: true
		};
	});
}
/** Every file the Kit writes into a project, with its writing rule. */
function buildPayload(options) {
	const launchers = workflowPlatformFacade.launchers();
	return [
		owned(KIT_BUNDLE_PATH, options.bundle),
		owned("scripts/workflow", launchers.posix, true),
		owned("scripts/workflow.cmd", launchers.cmd),
		owned("scripts/workflow.ps1", launchers.powershell),
		...hookEntries(options.hooksPath),
		section("AGENTS.md", "html", agentRules()),
		claudeLine(),
		providerHook(".codex/hooks.json", "codex"),
		providerHook(".claude/settings.json", "claude"),
		section(".gitignore", "hash", gitignoreSection()),
		section(".gitattributes", "hash", gitattributesSection()),
		created("README.md", readmeSkeleton(options.projectName)),
		created("docs/architecture/OVERVIEW.md", overviewSkeleton(options.projectName))
	];
}
function buildManifest(entries) {
	return {
		files: entries.map((entry) => ({
			executable: entry.executable,
			kind: entry.kind,
			path: entry.path,
			sha256: entry.managed === null ? null : sha256(entry.managed)
		})),
		schema: MANIFEST_SCHEMA,
		version: KIT_VERSION
	};
}
function renderManifest(manifest) {
	return `${JSON.stringify(manifest, null, 2)}\n`;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-inspect.ts
var PILOT_MANIFEST = ".harness/kit-manifest.json";
var LEGACY_PLAN_SCHEMA = "harness-ai-plan-v1";
var ACTIONS = {
	EMPTY: "install",
	GIT_NO_KIT: "install",
	KIT_DAMAGED: "doctor",
	KIT_OK: "open",
	KIT_OUTDATED: "update",
	LEGACY_HARNESS_PLAN: "install-migrate",
	MISSING: "create",
	NOT_GIT: "install",
	PILOT_KIT: "unsupported"
};
function file$2(root, relative) {
	return path.join(root, ...relative.split("/"));
}
/** Compares dotted versions; negative when `left` is older. */
function compareVersions(left, right) {
	const a = left.split(".").map(Number);
	const b = right.split(".").map(Number);
	for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
		const difference = (a[index] ?? 0) - (b[index] ?? 0);
		if (difference !== 0) return difference;
	}
	return 0;
}
function readManifest(root) {
	const text = workflowPlatformFacade.readTextIfExists(file$2(root, MANIFEST_PATH));
	if (text === null) return null;
	try {
		return JSON.parse(text);
	} catch {
		return {
			files: [],
			schema: "harness-workflow-manifest/1",
			version: "0"
		};
	}
}
/** Managed files whose managed part no longer matches the manifest hash. */
function damagedFiles(root, manifest) {
	return manifest.files.filter((item) => item.sha256 !== null).filter((item) => {
		const current = workflowPlatformFacade.readTextIfExists(file$2(root, item.path));
		const managed = readManaged(item.kind, item.path, current);
		return managed === null || sha256(managed) !== item.sha256;
	}).map((item) => item.path);
}
function kitState(root, manifest) {
	const damaged = damagedFiles(root, manifest);
	if (compareVersions(manifest.version, "2.0.0") < 0) return {
		damaged,
		state: "KIT_OUTDATED"
	};
	return {
		damaged,
		state: damaged.length > 0 ? "KIT_DAMAGED" : "KIT_OK"
	};
}
function classify(root, repository) {
	if (readdirSync(root).length === 0) return {
		damaged: [],
		state: "EMPTY"
	};
	if (existsSync(file$2(root, PILOT_MANIFEST))) return {
		damaged: [],
		state: "PILOT_KIT"
	};
	const manifest = readManifest(root);
	if (manifest) return kitState(root, manifest);
	if ((workflowPlatformFacade.readTextIfExists(file$2(root, ".harness/plans/todo-plan.md")) ?? "").includes(LEGACY_PLAN_SCHEMA)) return {
		damaged: [],
		state: "LEGACY_HARNESS_PLAN"
	};
	return {
		damaged: [],
		state: repository ? "GIT_NO_KIT" : "NOT_GIT"
	};
}
/** `inspect <path>`: classifies a folder without changing anything. */
function inspectFolder(git, folder) {
	const root = path.resolve(folder);
	const base = {
		damaged: [],
		nestedIn: null,
		path: root,
		stacks: [],
		transactionPending: false,
		version: null
	};
	if (!existsSync(root)) {
		const parent = path.dirname(root);
		return {
			...base,
			action: "create",
			git: {
				head: null,
				identity: existsSync(parent) ? git.identity(parent) : null,
				repository: false
			},
			state: "MISSING"
		};
	}
	ensure(statSync(root).isDirectory(), "NOT_A_DIRECTORY", `${root} is not a folder.`);
	const inside = git.isRepository(root);
	const top = inside ? git.topLevel(root) : null;
	const repository = top !== null && workflowPlatformFacade.samePath(realpathSync.native(path.resolve(top)), realpathSync.native(root));
	const nestedIn = inside && !repository ? top : null;
	const { damaged, state } = classify(root, repository);
	return {
		action: nestedIn ? "unsupported" : ACTIONS[state],
		damaged,
		git: {
			head: repository ? git.head(root) : null,
			identity: git.identity(root),
			repository
		},
		nestedIn,
		path: root,
		stacks: workflowQualityFacade.detect(root).map((stack) => stack.id),
		state,
		transactionPending: repository && git.transactions.journal(root) !== null,
		version: readManifest(root)?.version ?? null
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts
var KIT_STATES = /* @__PURE__ */ new Set([
	"KIT_DAMAGED",
	"KIT_OK",
	"KIT_OUTDATED"
]);
var SLUG_DROP$1 = /[^a-z0-9]+/gu;
var SLUG_TRIM = /^-+|-+$/gu;
function projectSlug(name) {
	return name.toLowerCase().replace(SLUG_DROP$1, "-").replace(SLUG_TRIM, "") || "project";
}
function file$1(root, relative) {
	return path.join(root, ...relative.split("/"));
}
/** Local `core.hooksPath` relative to the root, or null when unset. */
function localHooksPath(git, root) {
	const value = git.git.run(root, [
		"config",
		"--local",
		"--get",
		"core.hooksPath"
	], { allowFailure: true }).stdout.trim();
	if (value === "") return null;
	let relative;
	try {
		relative = workflowPlatformFacade.relativeFromRoot(root, path.resolve(root, value));
	} catch {
		throw new WorkflowError("HOOKS_PATH_OUTSIDE", `core.hooksPath points outside the project: ${value}`);
	}
	return relative === ".harness/workflow/hooks" ? null : relative;
}
function writeIfChanged(root, relative, next, executable) {
	const target = file$1(root, relative);
	const changed = workflowPlatformFacade.readTextIfExists(target) !== next;
	if (changed) workflowPlatformFacade.writeFileAtomic(target, next);
	if (executable && process.platform !== "win32") chmodSync(target, 493);
	return changed;
}
function checkPreconditions(state, update, nestedIn, pending) {
	ensure(!nestedIn, "NESTED_REPOSITORY", `The folder is inside the repository ${nestedIn}; choose its top level or another folder.`);
	ensure(state !== "PILOT_KIT", "PILOT_KIT_UNSUPPORTED", "This project uses Workflow Pilot (Kit 1.x), which Harness does not support.");
	ensure(!pending, "TRANSACTION_PENDING", "A Kit commit transaction is unfinished.", {}, "Run `scripts/workflow repair`.");
	if (update) ensure(KIT_STATES.has(state), "NOT_INSTALLED", "The Workflow Kit is not installed here; install it first.");
	else ensure(!KIT_STATES.has(state), "ALREADY_INSTALLED", "The Workflow Kit is already installed.", {}, "Use `install --update` or `doctor --fix`.");
}
function writePayload(root, entries) {
	const written = [];
	for (const entry of entries) {
		const current = workflowPlatformFacade.readTextIfExists(file$1(root, entry.path));
		if (writeIfChanged(root, entry.path, entry.render(current), entry.executable)) written.push(entry.path);
	}
	return written;
}
/** Writes configuration, manifest and runtime; returns the written paths. */
function writeState(root, entries, runtime) {
	const written = [];
	if (!workflowPlatformFacade.readTextIfExists(workflowQualityFacade.configFile(root))) {
		workflowQualityFacade.writeConfig(root, workflowQualityFacade.defaultConfig());
		written.push(workflowQualityFacade.configPath);
	}
	if (writeIfChanged(root, ".harness/workflow/manifest.json", renderManifest(buildManifest(entries)), false)) written.push(MANIFEST_PATH);
	if (runtime) workflowPlatformFacade.writeFileAtomic(file$1(root, RUNTIME_FILE), workflowPlatformFacade.formatRuntimeFile(runtime.executable, runtime.mode));
	return written;
}
function scopeOf(planText, legacy) {
	if (legacy) return null;
	try {
		return workflowPlanFacade.parse(planText).scope?.id ?? null;
	} catch {
		return null;
	}
}
function commitInstall(git, root, files, planText, update, scopeId) {
	try {
		return git.transactions.commit(root, {
			files,
			message: update ? `chore: update workflow kit to ${KIT_VERSION}` : `chore: install workflow kit ${KIT_VERSION}`,
			planPath: PLAN_PATH,
			planText,
			role: update ? "kit-update" : "bootstrap",
			scopeId,
			taskId: null
		});
	} catch (error) {
		if (error instanceof WorkflowError && error.code === "NOTHING_TO_COMMIT") return null;
		throw error;
	}
}
/** `install <path> [--update]`: writes the Kit and commits it through a transaction. */
function installKit(git, folder, options) {
	const inspected = inspectFolder(git, folder);
	const root = inspected.path;
	const update = options.update === true;
	checkPreconditions(inspected.state, update, inspected.nestedIn, inspected.transactionPending);
	ensure(inspected.git.identity, "GIT_IDENTITY", "Git has no user identity; nothing was written.", {}, "Run `git config --global user.name \"Your Name\"` and `git config --global user.email \"you@example.com\"`.");
	mkdirSync(root, { recursive: true });
	if (!inspected.git.repository) git.init(root);
	const hooksPath = localHooksPath(git, root);
	const before = new Set(git.changes(root).all);
	const name = options.name?.trim() || path.basename(root);
	const entries = buildPayload({
		bundle: options.bundle,
		hooksPath,
		projectName: name
	});
	const written = [...writePayload(root, entries), ...writeState(root, entries, options.runtime)];
	const migrationRequired = inspected.state === "LEGACY_HARNESS_PLAN";
	const existingPlan = workflowPlatformFacade.readTextIfExists(file$1(root, PLAN_PATH));
	const planText = existingPlan ?? workflowPlanFacade.render(workflowPlanFacade.createEmpty(projectSlug(name), name));
	if (hooksPath === null) git.setConfig(root, "core.hooksPath", OWN_HOOKS_DIR);
	return {
		commit: commitInstall(git, root, written, planText, update, scopeOf(planText, migrationRequired || existingPlan === null)),
		excluded: [...before].filter((item) => !written.includes(item)).sort(),
		hooksPath: hooksPath ?? ".harness/workflow/hooks",
		migrationRequired,
		previousState: inspected.state,
		root,
		version: KIT_VERSION,
		written
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts
var UPDATE = "Run `scripts/workflow doctor --fix` (or `install --update`).";
var check = (id, status, message, fixable = false, nextAction = null) => ({
	fixable,
	id,
	message,
	nextAction,
	status
});
function file(root, relative) {
	return path.join(root, ...relative.split("/"));
}
function manifestChecks(root) {
	const manifest = readManifest(root);
	if (!manifest) return [check("manifest", "fail", "The Workflow Kit manifest is missing.", false, "Install the Kit: `scripts/workflow install`.")];
	const checks = [compareVersions(manifest.version, "2.0.0") < 0 ? check("manifest", "fail", `Kit ${manifest.version} is older than ${KIT_VERSION}.`, true, UPDATE) : check("manifest", "ok", `Kit ${manifest.version}.`)];
	const damaged = damagedFiles(root, manifest);
	checks.push(damaged.length === 0 ? check("managed-files", "ok", "Managed files and sections match the manifest.") : check("managed-files", "fail", `Changed or missing managed parts: ${damaged.join(", ")}.`, true, UPDATE));
	if (process.platform !== "win32") {
		const blocked = manifest.files.filter((item) => item.executable && existsSync(file(root, item.path))).filter((item) => {
			try {
				accessSync(file(root, item.path), constants.X_OK);
				return false;
			} catch {
				return true;
			}
		}).map((item) => item.path);
		checks.push(blocked.length === 0 ? check("executable", "ok", "Launchers and hooks are executable.") : check("executable", "fail", `Not executable: ${blocked.join(", ")}.`, true, UPDATE));
	}
	return checks;
}
function hooksCheck(git, root) {
	const hooksPath = git.git.run(root, [
		"config",
		"--local",
		"--get",
		"core.hooksPath"
	], { allowFailure: true }).stdout.trim();
	if (hooksPath === "") return check("git-hooks", "fail", "core.hooksPath is not set, so Kit hooks do not run.", true, UPDATE);
	const missing = MANAGED_GIT_HOOKS.filter((name) => {
		const text = workflowPlatformFacade.readTextIfExists(path.resolve(root, hooksPath, name));
		return text === null || extractSection(text, "hash") === null;
	});
	return missing.length === 0 ? check("git-hooks", "ok", `Kit hooks run from ${hooksPath === ".harness/workflow/hooks" ? OWN_HOOKS_DIR : hooksPath}.`) : check("git-hooks", "fail", `Hooks without the Kit section in ${hooksPath}: ${missing.join(", ")}.`, true, UPDATE);
}
function planChecks(git, root) {
	const checks = [];
	try {
		const plan = workflowPlanFacade.read(root);
		if (!plan) return [check("plan", "fail", `${PLAN_PATH} is missing.`, false, "Run `scripts/workflow install --update`.")];
		git.resolveReferences(root, plan, PLAN_PATH);
		checks.push(check("plan", "ok", `Plan revision ${plan.revision} matches the history.`));
	} catch (error) {
		const { code, message } = error;
		checks.push(check("plan", "fail", `${code ?? "ERROR"}: ${message}`, false, "Run `scripts/workflow repair`."));
	}
	checks.push(git.transactions.journal(root) ? check("transaction", "fail", "A commit transaction is unfinished.", false, "Run `scripts/workflow repair`.") : check("transaction", "ok", "No unfinished transaction."));
	return checks;
}
function environmentChecks(git, root, options) {
	const runtime = workflowPlatformFacade.resolveRuntime(root, options.env ?? process.env, options.probe);
	const identity = git.identity(root);
	const drift = workflowQualityFacade.drift(root);
	return [
		runtime ? check("runtime", "ok", `${runtime.mode} ${runtime.version} (${runtime.source}).`) : check("runtime", "fail", "No Node.js 22+ runtime for the launchers.", false, "Install Node.js 22 or newer, or open the project in Harness AI."),
		identity ? check("git-identity", "ok", `${identity.name} <${identity.email}>.`) : check("git-identity", "fail", "Git has no user identity.", false, "Set git user.name and user.email."),
		drift.status === "drift" ? check("quality-drift", "warn", `Quality profile drift: new ${drift.added.join(", ") || "none"}, missing ${drift.missing.join(", ") || "none"}.`, false, "Extend the plan with a QUALITY task.") : check("quality-drift", "ok", drift.status === "discovery" ? "Quality profile not configured yet." : "Quality profile matches the stacks.")
	];
}
function inspectProject(git, root, options) {
	return [
		...manifestChecks(root),
		hooksCheck(git, root),
		...planChecks(git, root),
		...environmentChecks(git, root, options)
	];
}
/** `doctor [--fix]`: project health; `fix` repairs only fixable findings. */
function runDoctor(git, folder, options = {}) {
	const root = path.resolve(folder);
	let checks = inspectProject(git, root, options);
	let fix = null;
	if (options.fix && checks.some((item) => item.status === "fail" && item.fixable)) {
		fix = installKit(git, root, {
			...options.fix,
			update: true
		});
		checks = inspectProject(git, root, options);
	}
	return {
		checks,
		fix,
		ok: checks.every((item) => item.status !== "fail"),
		root
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-legacy-plan.ts
var LEGACY_SCHEMA = "harness-ai-plan-v1";
var STATE_BLOCK = /<!-- harness-plan-state:start -->\s*```json\s*([\s\S]*?)```\s*<!-- harness-plan-state:end -->/u;
var ROW_START = /^\d+\.\s+\[(TODO|IN_PROGRESS|DONE)\]\s+(.*)$/u;
var TASK_ROW = /^`([^`]+)`\s+([\s\S]*)$/u;
var PHASE_HEADING = /^##\s+(.+?)\s*$/u;
var EXPECTED_COMMIT = /expected commit:\s*`([^`]+)`/u;
var COMPLETION = /completion:\s*([a-z-]+)/u;
var KIND = /\(kind:\s*([a-z]+)\)/u;
var SCOPE = /\(scope:\s*([^;)]*)/u;
var TITLE_END = /\s+\((?:scope|kind|completion):/u;
var RESULT_TAIL = /\s+Result:[\s\S]*$/u;
var CONTEXT_PATH = /`([^`\s]+\.(?:md|json))`/gu;
var CONTINUATION = /^\s+\S/u;
var LINE_BREAK = /\r?\n/u;
function rows(text) {
	const result = [];
	let phase = "";
	for (const line of text.split(LINE_BREAK)) {
		const heading = PHASE_HEADING.exec(line);
		const start = ROW_START.exec(line);
		const last = result.at(-1);
		if (heading?.[1]) phase = heading[1];
		else if (start?.[1] && start[2] !== void 0) result.push({
			body: start[2],
			phase,
			status: start[1]
		});
		else if (last && CONTINUATION.test(line)) last.body = `${last.body} ${line.trim()}`;
	}
	return result;
}
function taskOf(row) {
	const match = TASK_ROW.exec(row.body);
	if (!(match?.[1] && match[2] !== void 0)) return null;
	const body = match[2];
	const titleEnd = body.search(TITLE_END);
	const title = (titleEnd === -1 ? body : body.slice(0, titleEnd)).replace(RESULT_TAIL, "").trim();
	return {
		completion: COMPLETION.exec(body)?.[1] ?? null,
		expectedCommit: EXPECTED_COMMIT.exec(body)?.[1] ?? null,
		id: match[1],
		kind: KIND.exec(body)?.[1] ?? null,
		phase: row.phase,
		scope: SCOPE.exec(body)?.[1]?.trim() ?? null,
		status: row.status,
		title: title || match[1]
	};
}
function contextPaths(text) {
	const start = text.indexOf("## Context Pack");
	if (start === -1) return [];
	const end = text.indexOf("\n## ", start + 1);
	const section = text.slice(start, end === -1 ? void 0 : end);
	return [...new Set([...section.matchAll(CONTEXT_PATH)].map((item) => item[1] ?? "").filter(Boolean))];
}
/** Parses a `harness-ai-plan-v1` document: state block, task rows, context pack. */
function parseLegacyPlan(text) {
	const block = STATE_BLOCK.exec(text)?.[1];
	ensure(block, "NOT_LEGACY_PLAN", "The plan has no harness-ai-plan-v1 state block.");
	let state;
	try {
		state = JSON.parse(block);
	} catch {
		state = {};
	}
	ensure(state.schema === LEGACY_SCHEMA, "NOT_LEGACY_PLAN", `The plan schema is not ${LEGACY_SCHEMA}.`);
	return {
		context: contextPaths(text),
		currentTaskId: typeof state.currentTaskId === "string" ? state.currentTaskId : null,
		planId: typeof state.planId === "string" ? state.planId : "legacy-plan",
		scopeStatus: typeof state.executionScopeStatus === "string" ? state.executionScopeStatus : "NONE",
		tasks: rows(text).map(taskOf).filter((task) => task !== null)
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-migrate.ts
var LEGACY_ROUND = "R0-legacy";
var DEFAULT_MESSAGE = "chore: migrate the plan into the workflow kit";
var RESULT_LIMIT = 590;
function task(legacy, kind, dependencies) {
	return {
		acceptance: [legacy.title],
		checks: [],
		commitMessage: legacy.expectedCommit ?? `chore: ${legacy.id}`,
		confirmation: null,
		context: [],
		dependencies,
		docsWaiver: null,
		files: [],
		fixes: null,
		id: legacy.id,
		iteration: 1,
		kind,
		roundId: "R1",
		status: "TODO",
		title: legacy.title,
		why: `Migrated from ${legacy.phase || "the legacy plan"}${legacy.scope ? `; legacy scope: ${legacy.scope}` : ""}.`
	};
}
function docsTask(source, dependencies) {
	return {
		acceptance: ["Project-wide documents describe the round result", "The round digest records result, decisions, contracts and references"],
		checks: [],
		commitMessage: source?.expectedCommit ?? "docs: reconcile documentation for R1",
		confirmation: null,
		context: [],
		dependencies,
		docsWaiver: null,
		files: [],
		fixes: null,
		id: "DOCS-R1",
		iteration: 1,
		kind: "docs",
		roundId: "R1",
		status: "TODO",
		title: source?.title ?? "Reconcile project documentation and write the round digest",
		why: "Keep the project context current for the next agent and close the round."
	};
}
function legacyResult(legacy, done) {
	const first = done[0]?.id ?? "none";
	const last = done.at(-1)?.id ?? "none";
	const text = `Legacy plan ${legacy.planId}: ${done.length} tasks were done before the move to the Workflow Kit (${first} … ${last}). Their rows stay in the plan of the parent commit of the migration.`;
	return text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}…` : text;
}
/** Builds the Workflow Kit plan for the remaining work of a legacy plan. */
function buildMigratedPlan(legacy, base, options, existing) {
	const message = options.message ?? DEFAULT_MESSAGE;
	const finished = (item) => item.status === "DONE" || item.expectedCommit === message;
	const done = legacy.tasks.filter(finished);
	const pending = legacy.tasks.filter((item) => !finished(item));
	const acceptanceRows = pending.filter((item) => item.completion === "user-acceptance");
	const docsRows = pending.filter((item) => item.kind === "docs");
	const regular = pending.filter((item) => item.completion !== "user-acceptance" && item.kind !== "docs" && item.kind !== "delivery");
	const deliveries = pending.filter((item) => item.kind === "delivery" && item.completion !== "user-acceptance");
	const plan = workflowPlanFacade.createEmpty(base.projectId, base.projectName);
	const converted = [...acceptanceRows.map((item) => `${item.id} → the user's acceptance through \`accept\``), ...docsRows.map((item) => `${item.id} → DOCS-R1`)];
	if (legacy.scopeStatus !== "ACTIVE" || regular.length + deliveries.length + docsRows.length === 0) return {
		converted,
		legacyDone: done.length,
		migrated: [],
		plan
	};
	const work = regular.map((item) => task(item, item.kind === "quality" ? "quality" : "work", []));
	const docs = docsTask(docsRows[0], work.map((item) => item.id));
	plan.scope = {
		acceptance: options.acceptance ?? ["The user accepts the delivered result"],
		acceptanceNote: null,
		approval: {
			at: options.now,
			text: `Migrated from the legacy plan ${legacy.planId} by migrate:harness-plan.`
		},
		baselineCommit: base.baselineCommit,
		blockedReason: null,
		context: legacy.context.filter(existing).map((item) => ({
			path: item,
			required: false
		})),
		decisions: converted.map((text) => ({
			at: options.now,
			text: `Migration: ${text}.`
		})),
		delivery: "IN_PROGRESS",
		id: legacy.planId,
		objective: options.objective ?? `Finish the remaining work of ${legacy.planId}.`,
		spec: options.spec ?? null,
		status: "ACTIVE"
	};
	plan.rounds = [{
		digest: {
			contracts: [],
			decisions: [],
			references: [`git show ${base.baselineCommit}:${PLAN_PATH}`],
			result: legacyResult(legacy, done)
		},
		id: LEGACY_ROUND,
		kind: "legacy",
		status: "CLOSED",
		title: `Legacy plan ${legacy.planId}`
	}, {
		digest: null,
		id: "R1",
		kind: "implementation",
		status: "OPEN",
		title: "Remaining work"
	}];
	plan.tasks = [
		...work,
		docs,
		...deliveries.map((item) => task(item, "delivery", [docs.id]))
	];
	return {
		converted,
		legacyDone: done.length,
		migrated: plan.tasks.map((item) => item.id),
		plan: workflowPlanFacade.validate(plan)
	};
}
/** `migrate:harness-plan`: replaces a legacy plan with a Kit plan in one kit-update commit. */
function migrateHarnessPlan(git, folder, options) {
	const root = path.resolve(folder);
	ensure(readManifest(root), "NOT_INSTALLED", "Install the Workflow Kit before migrating the plan.", {}, "Run `scripts/workflow install`.");
	const text = workflowPlatformFacade.readTextIfExists(path.join(root, ...PLAN_PATH.split("/")));
	ensure(text, "NOT_LEGACY_PLAN", `${PLAN_PATH} does not exist.`);
	const legacy = parseLegacyPlan(text);
	const baselineCommit = git.head(root);
	ensure(baselineCommit, "NO_COMMITS", "The repository has no commits yet.");
	const name = options.name?.trim() || path.basename(root);
	const result = buildMigratedPlan(legacy, {
		baselineCommit,
		projectId: projectSlug(name),
		projectName: name
	}, options, (relative) => existsSync(path.join(root, ...relative.split("/"))));
	ensure(git.transactions.journal(root) === null, "TRANSACTION_PENDING", "A Kit commit transaction is unfinished.");
	return {
		commit: git.transactions.commit(root, {
			files: [],
			message: options.message ?? DEFAULT_MESSAGE,
			planPath: PLAN_PATH,
			planText: workflowPlanFacade.render(result.plan),
			role: "kit-update",
			scopeId: result.plan.scope?.id ?? null,
			taskId: null
		}),
		converted: result.converted,
		legacyDone: result.legacyDone,
		migrated: result.migrated,
		scopeId: result.plan.scope?.id ?? null
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-facade.ts
/**
* Public facade of the workflow-installer module: the installation payload,
* folder inspection, install and update, the project doctor and the
* migration of legacy Harness plans.
*/
var WorkflowInstallerFacade = class {
	version = KIT_VERSION;
	manifestPath = MANIFEST_PATH;
	git;
	constructor(git = workflowGitFacade) {
		this.git = git;
	}
	/** `inspect <path>`: classifies a folder without changing it. */
	inspect(folder) {
		return inspectFolder(this.git, folder);
	}
	/** `install <path> [--update]`: installs or updates the Kit and commits it. */
	install(folder, options) {
		return installKit(this.git, folder, options);
	}
	/** `doctor [--fix]`: health checks; `fix` repairs fixable findings only. */
	doctor(folder, options = {}) {
		return runDoctor(this.git, folder, options);
	}
	/** `migrate:harness-plan`: a legacy Harness plan becomes a Kit plan. */
	migrateHarnessPlan(folder, options) {
		return migrateHarnessPlan(this.git, folder, options);
	}
	/** Every file the Kit writes into a project, with its writing rule. */
	payload(options) {
		return buildPayload(options);
	}
	manifest(entries) {
		return buildManifest(entries);
	}
	renderManifest(manifest) {
		return renderManifest(manifest);
	}
	/** The English agent rules of the managed AGENTS.md section. */
	agentRules() {
		return agentRules();
	}
};
new WorkflowInstallerFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-model.ts
var RECOVERY_SCHEMA = "harness-workflow-recovery/1";
var KIT_COMMAND = "scripts/workflow";
function byteLength(text) {
	return Buffer.byteLength(text, "utf8");
}
/** Cuts text to at most `limit` UTF-8 bytes without splitting a character. */
function cutBytes(text, limit) {
	if (byteLength(text) <= limit) return text;
	let result = Buffer.from(text, "utf8").subarray(0, Math.max(0, limit)).toString("utf8");
	while (result.endsWith("�")) result = result.slice(0, -1);
	return result;
}
function shortSha(sha) {
	return sha ? sha.slice(0, 8) : "none";
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-sections.ts
var LIST_LIMIT = 40;
var UPCOMING = 3;
var VERIFICATION_OUTPUT_BYTES = 1024;
var ROUND_LINE_BYTES = 160;
function bullets(items, empty = "none") {
	return items.length === 0 ? `- ${empty}` : items.map((item) => `- ${item}`).join("\n");
}
function limited(paths) {
	const shown = paths.slice(0, LIST_LIMIT);
	return paths.length > LIST_LIMIT ? [...shown, `… ${paths.length - LIST_LIMIT} more`] : shown;
}
function oneLine(task) {
	return `${task.id} [${task.kind}] ${task.title}`;
}
/** The current task, or the next ready one. */
function focusTask(plan) {
	const current = plan.tasks.find((task) => task.id === plan.currentTaskId);
	if (current) return current;
	const done = new Set(plan.tasks.filter((task) => task.status === "DONE").map((task) => task.id));
	return plan.tasks.find((task) => task.status === "TODO" && task.dependencies.every((id) => done.has(id))) ?? null;
}
function stateSection(input) {
	const { plan } = input;
	const scope = plan.scope;
	const transaction = input.transaction ? `${input.transaction.id} ${input.transaction.phase} (${input.transaction.role}${input.transaction.taskId ? ` ${input.transaction.taskId}` : ""})` : "none";
	return [
		`project: ${plan.projectName} (${plan.projectId})`,
		scope ? `scope: ${scope.id} ${scope.status}, result ${scope.delivery}, revision ${plan.revision}` : `scope: NONE, revision ${plan.revision}`,
		`quality: ${input.quality.status}${input.quality.stacks.length > 0 ? ` (${input.quality.stacks.join(", ")})` : ""}`,
		`head: ${shortSha(input.head)}`,
		`transaction: ${transaction}`,
		`event: ${input.event}`,
		...(input.warnings ?? []).map((warning) => `warning: ${warning}`)
	].join("\n");
}
function nextSection(input) {
	const { plan } = input;
	const scope = plan.scope;
	if (!scope) return "No active scope. Agree a new scope with the user, then create it.";
	if (input.transaction) return `A commit transaction is unfinished: run \`${KIT_COMMAND} repair\` before anything else.`;
	if (scope.status === "BLOCKED") return `BLOCKED: ${scope.blockedReason ?? "no reason recorded"}. Resolve it with the user, then unblock.`;
	if (scope.delivery === "READY_FOR_ACCEPTANCE") return "Scope is READY_FOR_ACCEPTANCE: ask the user to accept the result or report defects.";
	if (scope.delivery === "ACCEPTED") return "Scope is ACCEPTED: the user decides when to close it.";
	const task = focusTask(plan);
	if (!task) return "No task is ready: check dependencies with the user.";
	if (task.status === "IN_PROGRESS") return `Continue ${task.id}: ${task.title}`;
	if (task.kind === "delivery") return `Next task ${task.id} is delivery: ask the user to confirm it, then \`${KIT_COMMAND} task:start ${task.id} --confirm "<user confirmation>"\`.`;
	return `Start ${task.id} via \`${KIT_COMMAND} task:start ${task.id}\`: ${task.title}`;
}
function objectiveSection(input) {
	const scope = input.plan.scope;
	if (!scope) return "none";
	return [
		scope.objective,
		"",
		"Acceptance:",
		bullets(scope.acceptance)
	].join("\n");
}
function field(name, value, cap, taskId) {
	if (cap === null || Buffer.byteLength(value, "utf8") <= cap) return `${name}: ${value}`;
	const kept = cutBytes(value, cap);
	return `${name}: ${kept} [truncated: ${Buffer.byteLength(value, "utf8") - Buffer.byteLength(kept, "utf8")} bytes, run: ${KIT_COMMAND} show-task ${taskId}]`;
}
/** Full text of one task; `cap` limits each long field in UTF-8 bytes. */
function describeTask(plan, task, taskCommits, cap = null) {
	const lines = [
		`${task.id} [${task.kind}] ${task.status}, round ${task.roundId}, iteration ${task.iteration}`,
		`title: ${task.title}`,
		field("why", task.why, cap, task.id),
		field("files", task.files.join(", ") || "none", cap, task.id),
		`dependencies: ${task.dependencies.join(", ") || "none"}`,
		`checks: ${task.checks.join(", ") || "profile defaults"}`,
		field("acceptance", task.acceptance.join(" | ") || "none", cap, task.id),
		field("context", task.context.map((ref) => ref.heading ? `${ref.path}#${ref.heading}` : ref.path).join(", ") || "none", cap, task.id),
		`commit: ${task.commitMessage}`
	];
	if (task.docsWaiver) lines.push(`docsWaiver: ${task.docsWaiver}`);
	if (task.confirmation) lines.push(`confirmation: ${task.confirmation}`);
	if (task.fixes) {
		const original = plan.tasks.find((item) => item.id === task.fixes);
		lines.push(`fixes: ${task.fixes} ${shortSha(taskCommits[task.fixes])}${original ? ` — ${original.title}` : ""}`);
	}
	if (taskCommits[task.id]) lines.push(`committed: ${taskCommits[task.id]}`);
	return lines.join("\n");
}
/** The focus task in full; `cap` limits each long field in UTF-8 bytes. */
function taskSection(input, cap = null) {
	const task = focusTask(input.plan);
	return task ? describeTask(input.plan, task, input.taskCommits, cap) : "none";
}
function upcomingSection(input) {
	const focus = focusTask(input.plan);
	const pending = input.plan.tasks.filter((task) => task.status === "TODO" && task.id !== focus?.id);
	const shown = pending.slice(0, UPCOMING).map(oneLine);
	const rest = pending.length - shown.length;
	return [bullets(shown), `remaining after these: ${rest}`].join("\n");
}
function recentSection(input) {
	return bullets(input.plan.tasks.filter((task) => task.status === "DONE").slice(-3).map((task) => `${task.id} ${shortSha(input.taskCommits[task.id])} ${task.title}`));
}
function roundsSection(input) {
	const digested = input.plan.rounds.filter((round) => round.digest);
	if (digested.length === 0) return null;
	const full = digested.slice(-3);
	const lines = digested.slice(0, -3).map((round) => `- ${round.id} ${round.title}: ${cutBytes(round.digest?.result ?? "", ROUND_LINE_BYTES)}`);
	for (const round of full) {
		const digest = round.digest;
		if (!digest) continue;
		lines.push(`### ${round.id} ${round.title} (${round.status})`, digest.result);
		for (const [label, items] of [
			["decisions", digest.decisions],
			["contracts", digest.contracts],
			["references", digest.references]
		]) if (items.length > 0) lines.push(`${label}:`, bullets(items));
	}
	return lines.join("\n");
}
function decisionsSection(input) {
	const decisions = input.plan.scope?.decisions ?? [];
	if (decisions.length === 0) return null;
	return bullets(decisions.slice(-5).map((decision) => `${decision.at}: ${decision.text}`));
}
function changesSection(input) {
	const lines = [`outside the task: ${input.changes.length === 0 ? "none" : ""}`.trimEnd()];
	if (input.changes.length > 0) lines.push(bullets(limited(input.changes)));
	if (input.transaction) lines.push(`pending transaction ${input.transaction.id}: ${input.transaction.phase}${input.transaction.error ? ` — ${cutBytes(input.transaction.error, 300)}` : ""}`);
	return lines.join("\n");
}
function verificationSection(input) {
	const verification = input.verification;
	if (!verification) return null;
	const lines = [`commit: ${shortSha(verification.commit)}`];
	let budget = VERIFICATION_OUTPUT_BYTES;
	for (const report of verification.reports) {
		lines.push(`${report.stage}: ${report.ok ? "ok" : "failed"}`);
		for (const item of report.results.filter((entry) => entry.status !== "passed" && entry.status !== "skipped")) {
			const output = cutBytes(item.output.slice(-1024), budget);
			budget -= Buffer.byteLength(output, "utf8");
			lines.push(`- ${item.id} ${item.status}${output ? `:\n${output}` : ""}`);
		}
	}
	return lines.join("\n");
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-budget.ts
var RULES_POINTER = "rules: follow the Workflow Kit section of AGENTS.md (managed by the kit).";
var TASK_CAPS = [
	2e3,
	1e3,
	500,
	250,
	120,
	60
];
var HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;
var SLUG_DROP = /[^\p{L}\p{N}\s-]/gu;
var SLUG_SPACE = /\s+/gu;
function slug(text) {
	return text.toLowerCase().replace(SLUG_DROP, "").trim().replace(SLUG_SPACE, "-");
}
/** Returns the Markdown section under a heading (text or slug match), or null. */
function extractHeading(text, heading) {
	const lines = text.split("\n");
	const wanted = slug(heading);
	let start = -1;
	let level = 0;
	for (const [index, line] of lines.entries()) {
		const match = HEADING_PATTERN.exec(line);
		if (!match?.[1] || match[2] === void 0) continue;
		if (start === -1 && slug(match[2]) === wanted) {
			start = index;
			level = match[1].length;
		} else if (start !== -1 && match[1].length <= level) return lines.slice(start, index).join("\n").trimEnd();
	}
	return start === -1 ? null : lines.slice(start).join("\n").trimEnd();
}
function render(input, parts, references, omitted, bytes) {
	const sorted = [...parts].sort((left, right) => left.order - right.order);
	const head = [
		"# Workflow recovery packet",
		`bytes: ${bytes} / budget: ${input.budgetBytes}${bytes > input.budgetBytes ? " (over budget)" : ""}`,
		`included: ${sorted.map((part) => part.name).join(", ")}`,
		`omitted: ${omitted.length > 0 ? omitted.join(", ") : "none"}`,
		RULES_POINTER
	].join("\n");
	const body = sorted.map((part) => `## ${part.name}\n${part.text}`);
	const refs = `## references\n${references.length > 0 ? references.map((line) => `- ${line}`).join("\n") : "- none"}`;
	return `${[
		head,
		...body,
		refs
	].join("\n\n")}\n`;
}
/** Renders until the byte count printed in the header matches the text. */
function settle(input, parts, references, omitted) {
	let bytes = 0;
	let text = render(input, parts, references, omitted, bytes);
	for (let attempt = 0; attempt < 4 && byteLength(text) !== bytes; attempt += 1) {
		bytes = byteLength(text);
		text = render(input, parts, references, omitted, bytes);
	}
	return {
		bytes: byteLength(text),
		text
	};
}
/**
* Scope and task documents, one entry per path: a whole-document reference
* wins over a heading reference, and a path is required if any ref says so.
*/
function documentRefs(input) {
	const scope = input.plan.scope;
	const refs = [];
	if (scope?.spec) refs.push({
		path: scope.spec,
		required: true
	});
	refs.push(...scope?.context ?? [], ...focusTask(input.plan)?.context ?? []);
	const byPath = /* @__PURE__ */ new Map();
	for (const ref of refs) {
		const known = byPath.get(ref.path);
		if (!known) {
			byPath.set(ref.path, { ...ref });
			continue;
		}
		byPath.set(ref.path, {
			...known.heading && !ref.heading ? { path: ref.path } : known,
			required: known.required || ref.required
		});
	}
	return [...byPath.values()];
}
function documentCandidates(input, references) {
	const candidates = [];
	for (const ref of documentRefs(input)) {
		const label = ref.heading ? `${ref.path}#${ref.heading}` : ref.path;
		const text = input.readDocument(ref.path);
		if (text === null) {
			references.push(`${label}: missing file`);
			continue;
		}
		if (!ref.required) {
			references.push(`${label} (${byteLength(text)} bytes, optional): read the file when needed`);
			continue;
		}
		const options = [{
			name: `document ${ref.path}`,
			order: 11,
			text: text.trimEnd()
		}];
		const section = ref.heading ? extractHeading(text, ref.heading) : null;
		if (section) options.push({
			name: `document ${label}`,
			order: 11,
			text: section
		});
		candidates.push({
			options,
			reference: `${label} (${byteLength(text)} bytes): read the file`
		});
	}
	return candidates;
}
function optionalCandidates(input, references) {
	const candidates = [];
	const add = (name, order, text, reference) => {
		if (text !== null) candidates.push({
			options: [{
				name,
				order,
				text
			}],
			reference: reference(byteLength(text))
		});
	};
	add("rounds", 7, roundsSection(input), (bytes) => `rounds (${bytes} bytes): run \`${KIT_COMMAND} history\``);
	add("decisions", 8, decisionsSection(input), (bytes) => `decisions (${bytes} bytes): scope.decisions in ${PLAN_PATH}`);
	add("verification", 10, verificationSection(input), (bytes) => `verification (${bytes} bytes): .harness/workflow/local/verification/last.json`);
	return [...candidates, ...documentCandidates(input, references)];
}
function mandatoryParts(input, cap) {
	return [
		{
			name: "state",
			order: 1,
			text: stateSection(input)
		},
		{
			name: "next",
			order: 2,
			text: nextSection(input)
		},
		{
			name: "objective",
			order: 3,
			text: objectiveSection(input)
		},
		{
			name: "task",
			order: 4,
			text: taskSection(input, cap)
		},
		{
			name: "upcoming",
			order: 5,
			text: upcomingSection(input)
		},
		{
			name: "recent",
			order: 6,
			text: recentSection(input)
		},
		{
			name: "changes",
			order: 9,
			text: changesSection(input)
		}
	];
}
function assembleWithCap(input, cap) {
	const references = [];
	const omitted = [];
	const candidates = optionalCandidates(input, references);
	const fits = (parts) => settle(input, parts, references, omitted).bytes <= input.budgetBytes;
	let parts = mandatoryParts(input, cap);
	const optional = [];
	for (const candidate of candidates) {
		const chosen = candidate.options.find((option) => fits([...parts, option]));
		if (chosen) {
			parts = [...parts, chosen];
			optional.push({
				candidate,
				part: chosen
			});
			if (chosen !== candidate.options[0]) references.push(`${candidate.reference} (only its section is included)`);
		} else {
			omitted.push(candidate.options[0]?.name ?? "section");
			references.push(candidate.reference);
		}
	}
	while (!fits(parts) && optional.length > 0) {
		const last = optional.pop();
		if (last) {
			parts = parts.filter((part) => part !== last.part);
			omitted.push(last.part.name);
			references.push(last.candidate.reference);
		}
	}
	const { bytes, text } = settle(input, parts, references, omitted);
	const sorted = [...parts].sort((left, right) => left.order - right.order);
	return {
		budget: input.budgetBytes,
		bytes,
		event: input.event,
		included: sorted.map((part) => part.name),
		omitted,
		overBudget: bytes > input.budgetBytes,
		references,
		schema: RECOVERY_SCHEMA,
		sections: sorted.map(({ name, text: sectionText }) => ({
			name,
			text: sectionText
		})),
		text,
		truncated: cap !== null && taskSection(input, cap) !== taskSection(input)
	};
}
/**
* Assembles the packet by priority within `budgetBytes`. Mandatory sections
* always stay; when they do not fit, long task fields are shortened with a
* marker, step by step. Optional sections move to references when they do
* not fit. Nothing is cut silently: an oversized packet says so.
*/
function assemblePacket(input) {
	let packet = assembleWithCap(input, null);
	for (const cap of TASK_CAPS) {
		if (!packet.overBudget) break;
		packet = assembleWithCap(input, cap);
	}
	return packet;
}
var EVENTS$1 = /* @__PURE__ */ new Set([
	"startup",
	"resume",
	"clear",
	"compact"
]);
/** Reads the SessionStart event (`source`) from the hook input; defaults to startup. */
function hookEvent(stdin) {
	try {
		const parsed = JSON.parse(stdin || "{}");
		const source = parsed && typeof parsed === "object" ? parsed.source : void 0;
		return typeof source === "string" && EVENTS$1.has(source) ? source : "startup";
	} catch {
		return "startup";
	}
}
/**
* SessionStart hook response. Inside Harness (`HARNESS_WORKFLOW_RECOVERY=host`)
* the host already delivered the packet, so no context is repeated.
*/
function sessionStartResponse(context, env) {
	const output = { hookEventName: "SessionStart" };
	if (env["HARNESS_WORKFLOW_RECOVERY"] !== "host") output.additionalContext = context();
	return `${JSON.stringify({
		continue: true,
		hookSpecificOutput: output
	})}\n`;
}
function showTaskText(plan, taskId, commits) {
	const task = plan.tasks.find((item) => item.id === taskId);
	ensure(task, "UNKNOWN_TASK", `Task not found: ${taskId}`);
	return `${describeTask(plan, task, commits)}\n`;
}
/** Workflow commits since the scope baseline, filtered by task or round. */
function workflowHistory(git, root, plan, filter) {
	const roundTasks = filter.round ? new Set(plan.tasks.filter((task) => task.roundId === filter.round).map((task) => task.id)) : null;
	return (git.head(root) ? git.history(root, plan.scope?.baselineCommit ?? null) : []).map((commit) => ({
		role: commit.trailers["Workflow-Role"]?.[0] ?? "external",
		sha: commit.sha,
		subject: commit.subject,
		taskId: commit.trailers["Workflow-Task"]?.[0] ?? null
	})).map((entry) => ({
		...entry,
		taskId: entry.taskId === "-" ? null : entry.taskId
	})).filter((entry) => !filter.task || entry.taskId === filter.task).filter((entry) => !roundTasks || entry.taskId !== null && roundTasks.has(entry.taskId));
}
function historyText(entries) {
	if (entries.length === 0) return "No workflow commits match.\n";
	return `${entries.map((entry) => `${entry.sha.slice(0, 8)} ${entry.role} ${entry.taskId ?? "-"} ${entry.subject}`).join("\n")}\n`;
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-gather.ts
function readDocument(root, file) {
	try {
		return workflowPlatformFacade.readTextIfExists(workflowPlatformFacade.resolveInside(root, file));
	} catch {
		return null;
	}
}
function taskCommits(git, root, plan, notes) {
	try {
		const commits = {};
		for (const [taskId, reference] of git.resolveReferences(root, plan, PLAN_PATH)) if (reference.status === "committed") commits[taskId] = reference.sha;
		return commits;
	} catch (error) {
		notes.warnings.push(`Commit references are inconsistent (${error.code ?? "error"}); run \`scripts/workflow doctor\`.`);
		return {};
	}
}
function transaction(git, root) {
	const journal = git.transactions.journal(root);
	return journal ? {
		error: journal.error,
		id: journal.id,
		phase: journal.phase,
		role: journal.role,
		taskId: journal.taskId
	} : null;
}
/** Changed paths outside the focus task, without Kit-managed state. */
function outsideChanges(git, root, plan) {
	const task = focusTask(plan);
	const own = new Set(task?.status === "IN_PROGRESS" ? task.files : []);
	return git.changes(root).all.filter((file) => !(own.has(file) || git.isKitManagedPath(file)));
}
/** Reads plan, configuration, git state and evidence of a project. */
function gatherRecovery(git, root, event, notes) {
	const plan = workflowPlanFacade.read(root) ?? workflowPlanFacade.createEmpty("unknown", "Project");
	const config = workflowQualityFacade.readConfig(root);
	const repository = git.isRepository(root);
	if (!repository) notes.warnings.push("The project is not a git repository.");
	const evidence = workflowQualityFacade.readEvidence(root);
	return {
		budgetBytes: config.budget.recoveryBytes,
		changes: repository ? outsideChanges(git, root, plan) : [],
		event,
		head: repository ? git.head(root) : null,
		plan,
		quality: {
			stacks: config.quality.stacks,
			status: config.quality.status
		},
		readDocument: (file) => readDocument(root, file),
		taskCommits: repository ? taskCommits(git, root, plan, notes) : {},
		transaction: repository ? transaction(git, root) : null,
		verification: evidence ? {
			commit: evidence.commit ?? null,
			reports: evidence.reports
		} : null
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts
/**
* Public facade of the workflow-recovery module: the bounded recovery
* packet, the session-start hook and on-demand task history.
*/
var WorkflowRecoveryFacade = class {
	git;
	constructor(git = workflowGitFacade) {
		this.git = git;
	}
	/** Builds the packet from already gathered state. */
	build(input) {
		return assemblePacket(input);
	}
	/** Markdown section under a heading, matched by text or slug. */
	section(text, heading) {
		return extractHeading(text, heading);
	}
	/** Reads plan, configuration, git state and evidence of a project. */
	gather(root, event = "startup") {
		const notes = { warnings: [] };
		return {
			...gatherRecovery(this.git, root, event, notes),
			warnings: notes.warnings
		};
	}
	packet(root, event = "startup") {
		return assemblePacket(this.gather(root, event));
	}
	/** `recover --format text|json`. */
	render(packet, format = "text") {
		return format === "json" ? `${JSON.stringify(packet, null, 2)}\n` : packet.text;
	}
	/**
	* `hook session-start --client claude|codex`: reads the hook input and
	* answers in the SessionStart format. Errors never block the session.
	*/
	sessionStart(root, options) {
		const event = hookEvent(options.stdin);
		return sessionStartResponse(() => {
			try {
				return this.packet(root, event).text;
			} catch (error) {
				const { code, message } = error;
				return `Workflow Kit could not build the recovery packet (${code ?? "error"}): ${message}\nRun \`scripts/workflow doctor\`.`;
			}
		}, options.env ?? process.env);
	}
	/** `show-task <ID>`: the full task text with its commit when done. */
	showTask(root, taskId) {
		const input = this.gather(root);
		return showTaskText(input.plan, taskId, input.taskCommits);
	}
	/** `history [--task ID] [--round R]`: workflow commits from git. */
	history(root, filter = {}) {
		const plan = workflowPlanFacade.read(root) ?? workflowPlanFacade.createEmpty("unknown", "Project");
		const entries = workflowHistory(this.git, root, plan, filter);
		return {
			entries,
			text: historyText(entries)
		};
	}
};
new WorkflowRecoveryFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-hooks.ts
var MANAGED_HINT = "Commit through the Workflow Kit: `scripts/workflow commit --task <ID>` or `scripts/workflow docs:commit`.";
var pass = (message = "") => ({
	code: null,
	exitCode: 0,
	message
});
var fail = (code, message) => ({
	code,
	exitCode: 1,
	message: `${code}: ${message}`
});
function fingerprints(root, files) {
	return files.map((file) => {
		const absolute = path.join(root, ...file.split("/"));
		return `${file}:${existsSync(absolute) ? createHash("sha256").update(readFileSync(absolute)).digest("hex") : "deleted"}`;
	}).join("\n");
}
function failedSummary(report) {
	return report.results.filter((item) => item.status !== "passed" && item.status !== "skipped").map((item) => `- ${item.id} ${item.status}${item.reason ? ` (${item.reason})` : ""}\n${item.output.slice(-1500)}`).join("\n");
}
function docsWaiver(journal) {
	if (!journal.taskId) return null;
	try {
		return workflowPlanFacade.parse(journal.candidatePlan, { projection: false }).tasks.find((task) => task.id === journal.taskId)?.docsWaiver ?? null;
	} catch {
		return null;
	}
}
function preCommit(context) {
	const { git, root } = context;
	const journal = git.transactions.journal(root);
	if (!journal || journal.phase !== "PREPARED") return fail("MANAGED_COMMIT_REQUIRED", MANAGED_HINT);
	if (git.git.text(root, ["write-tree"]) !== journal.candidateTree) return fail("MANAGED_COMMIT_REQUIRED", "The index differs from the prepared candidate of the transaction.");
	const before = fingerprints(root, journal.selected);
	const report = workflowQualityFacade.runStage({
		assigned: journal.checks,
		config: workflowQualityFacade.readConfig(root),
		docsWaiver: docsWaiver(journal),
		env: context.env,
		files: journal.selected,
		root,
		service: journal.role !== "implementation",
		stage: "commit"
	});
	workflowQualityFacade.recordEvidence(root, journal.id, [report]);
	if (git.git.text(root, ["write-tree"]) !== journal.candidateTree || fingerprints(root, journal.selected) !== before) return fail("CHECK_MODIFIED_CANDIDATE", "A commit-stage check changed the candidate files; commit checks may only read. Move fixers to the prepare stage.");
	if (!report.ok) return fail("CHECK_FAILED", `Commit checks failed:\n${failedSummary(report)}`);
	return pass(`Workflow checks passed: ${report.results.map((item) => `${item.id} ${item.status}`).join(", ") || "none"}.`);
}
function commitMessage(context, args) {
	const journal = context.git.transactions.journal(context.root);
	const file = args[0] ? path.resolve(context.root, args[0]) : "";
	const message = file && existsSync(file) ? readFileSync(file, "utf8") : "";
	if (!(journal && message.includes(`Workflow-Transaction: ${journal.id}`))) return fail("MANAGED_COMMIT_REQUIRED", MANAGED_HINT);
	return pass();
}
/** The last round with finished work must have its DOCS task done. */
function pendingDocs(plan) {
	if (!plan) return null;
	const last = plan.rounds.filter((round) => plan.tasks.some((task) => task.roundId === round.id && task.kind !== "docs" && task.status === "DONE")).at(-1);
	if (!last || last.kind === "legacy") return null;
	const docs = plan.tasks.find((task) => task.roundId === last.id && task.kind === "docs");
	return docs && docs.status !== "DONE" ? docs.id : null;
}
function prePush(context) {
	if (context.git.transactions.journal(context.root)) return fail("TRANSACTION_PENDING", "A commit transaction is unfinished; run `scripts/workflow repair`.");
	const docs = pendingDocs(workflowPlanFacade.read(context.root));
	if (docs) return fail("DOCS_PENDING", `Finish ${docs} (documentation and round digest) before pushing.`);
	const report = workflowQualityFacade.runStage({
		config: workflowQualityFacade.readConfig(context.root),
		env: context.env,
		root: context.root,
		stage: "push"
	});
	if (!report.ok) return fail("CHECK_FAILED", `Push checks failed:\n${failedSummary(report)}`);
	return pass(`Workflow push checks passed: ${report.results.map((item) => item.id).join(", ") || "none"}.`);
}
/** `git-hook <name>`: the managed git hooks of an installed project. */
function runGitHook(context, name, args) {
	try {
		switch (name) {
			case "pre-commit": return preCommit(context);
			case "commit-msg": return commitMessage(context, args);
			case "post-commit": return pass();
			case "pre-push": return prePush(context);
			default: return fail("UNKNOWN_HOOK", `Unknown git hook: ${name}`);
		}
	} catch (error) {
		const { code, message } = error;
		return fail(code ?? "HOOK_ERROR", message);
	}
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-context.ts
function readPlan(context) {
	const plan = workflowPlanFacade.read(context.root);
	ensure(plan, "NOT_INSTALLED", `${PLAN_PATH} does not exist; install the Workflow Kit first.`, {}, "Run `scripts/workflow install` or open the project in Harness AI.");
	return plan;
}
function readConfig(context) {
	return workflowQualityFacade.readConfig(context.root);
}
function requireHead(context) {
	const head = context.git.head(context.root);
	ensure(head, "NO_COMMITS", "The repository has no commits yet.");
	return head;
}
function ensureNoTransaction(context) {
	ensure(context.git.transactions.journal(context.root) === null, "TRANSACTION_PENDING", "A commit transaction is unfinished.", {}, "Run `scripts/workflow repair`.");
}
function ensureRevision(plan, expected) {
	ensure(expected === void 0 || plan.revision === expected, "REVISION_MISMATCH", `The plan is at revision ${plan.revision}, not ${String(expected)}; read the status again.`, { revision: plan.revision });
}
/** Runs a mutating operation under the project lock. */
function locked(context, fn) {
	return workflowPlatformFacade.withLock(context.git.localPath(context.root, "kit.lock"), fn);
}
/** Commits the plan (and files) through a Kit transaction. */
function commitPlan(context, plan, request) {
	ensureNoTransaction(context);
	return context.git.transactions.commit(context.root, {
		...request,
		planPath: PLAN_PATH,
		planText: workflowPlanFacade.render(plan)
	});
}
/** Writes a plan state change that the next Kit commit records. */
function savePlan(context, plan) {
	workflowPlanFacade.write(context.root, plan);
}
function changedDocuments(context, paths) {
	const changed = new Set(context.git.changes(context.root).all);
	return [...new Set(paths.filter((item) => Boolean(item)))].filter((item) => changed.has(item));
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-quality.ts
/** `quality:detect`: a proposal that changes nothing. */
function detectQuality(context, stacks) {
	return workflowQualityFacade.propose(context.root, {
		stacks,
		which: (name) => context.git.platform.findExecutable(name, context.env) !== null
	});
}
/**
* `quality:apply`: installs approved tools, writes the CONFIGURED profile and
* commits it with the files the installation changed. A QUALITY task in
* progress is completed by this commit.
*/
function applyQuality(context, input) {
	return locked(context, () => {
		ensureNoTransaction(context);
		const current = readPlan(context);
		const task = current.tasks.find((item) => item.id === current.currentTaskId && item.kind === "quality");
		const before = new Set(context.git.changes(context.root).all);
		const applied = workflowQualityFacade.applyProfile(context.root, input, context.env);
		const configPath = workflowQualityFacade.configPath;
		let files;
		if (task) files = [...context.git.selectTaskFiles(context.root, {
			iteration: task.iteration,
			scopeId: current.scope?.id ?? "NONE",
			taskId: task.id
		}).selected, configPath];
		else files = [...context.git.changes(context.root).all.filter((file) => !(before.has(file) || context.git.isKitManagedPath(file))), configPath];
		let plan = current;
		if (task) {
			plan = structuredClone(current);
			const own = workflowPlanFacade.task(plan, task.id);
			own.files = [.../* @__PURE__ */ new Set([...own.files, ...files])];
			plan = workflowPlanFacade.completeTask(plan, task.id);
		}
		return {
			commit: commitPlan(context, plan, {
				files,
				iteration: task?.iteration,
				message: task?.commitMessage ?? "chore: apply the project quality profile",
				role: "quality",
				scopeId: current.scope?.id ?? null,
				taskId: task?.id ?? null
			}),
			config: applied.config,
			installs: applied.installs
		};
	});
}
/** `quality:status`: the profile, its checks by stage and drift. */
function qualityStatus(context) {
	const config = workflowQualityFacade.readConfig(context.root);
	const checks = {};
	for (const check of config.quality.checks) checks[check.stage] = [...checks[check.stage] ?? [], check.id];
	return {
		checks,
		drift: workflowQualityFacade.drift(context.root, config),
		stacks: config.quality.stacks,
		status: config.quality.status
	};
}
/** `repair`: dry run, `--apply <id>` or `--cancel <id>`. */
function repair(context, options = {}) {
	return locked(context, () => {
		if (options.apply) return context.git.applyRepair(context.root, PLAN_PATH, options.apply);
		if (options.cancel) return context.git.cancelRepair(context.root, PLAN_PATH, options.cancel);
		return context.git.planRepair(context.root, PLAN_PATH);
	});
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts
var PATCH_FIELDS = /* @__PURE__ */ new Set([
	"acceptance",
	"checks",
	"commitMessage",
	"context",
	"dependencies",
	"docsWaiver",
	"files",
	"title",
	"why"
]);
var IN_PROGRESS_FIELDS = /* @__PURE__ */ new Set([
	"acceptance",
	"checks",
	"docsWaiver",
	"files"
]);
function transition(context) {
	return {
		baselineCommit: requireHead(context),
		now: context.now(),
		qualityConfigured: readConfig(context).quality.status === "CONFIGURED"
	};
}
function change(plan, commit) {
	return {
		commit,
		revision: plan.revision,
		scopeId: plan.scope?.id ?? null
	};
}
/** `scope:create`: records the agreed scope and commits it with its documents. */
function createScope(context, input) {
	return locked(context, () => {
		ensureNoTransaction(context);
		const plan = workflowPlanFacade.createScope(readPlan(context), input, transition(context));
		return change(plan, commitPlan(context, plan, {
			files: changedDocuments(context, [input.spec, ...(input.context ?? []).map((ref) => ref.path)]),
			message: `docs: plan scope ${input.id}`,
			role: "scope-plan",
			scopeId: input.id,
			taskId: null
		}));
	});
}
/** `plan:extend`: adds tasks to the open round or a new round. */
function extendScope(context, input, expectedRevision) {
	return locked(context, () => {
		const current = readPlan(context);
		ensureRevision(current, expectedRevision);
		const result = workflowPlanFacade.extend(current, input, transition(context));
		const commit = commitPlan(context, result.plan, {
			files: [],
			message: `docs: extend scope ${current.scope?.id ?? "NONE"} (${result.roundId})`,
			role: "scope-plan",
			scopeId: current.scope?.id ?? null,
			taskId: null
		});
		return {
			...change(result.plan, commit),
			deferredDocsTaskId: result.deferredDocsTaskId,
			roundId: result.roundId
		};
	});
}
/** `task:update`: edits a task that is not done. */
function updateTask(context, taskId, patch, expectedRevision) {
	return locked(context, () => {
		const current = readPlan(context);
		ensureRevision(current, expectedRevision);
		const original = workflowPlanFacade.task(current, taskId);
		const fields = Object.keys(patch);
		ensure(fields.length > 0 && fields.every((field) => PATCH_FIELDS.has(field)), "TASK_PATCH", `task:update changes only: ${[...PATCH_FIELDS].join(", ")}.`);
		ensure(original.status === "TODO" || original.status === "IN_PROGRESS" && fields.every((field) => IN_PROGRESS_FIELDS.has(field)), "TASK_PATCH", original.status === "DONE" ? "A DONE task never changes; extend the plan with a fix task." : `A task in progress changes only: ${[...IN_PROGRESS_FIELDS].join(", ")}.`);
		const plan = structuredClone(current);
		plan.revision += 1;
		Object.assign(workflowPlanFacade.task(plan, taskId), structuredClone(patch));
		workflowPlanFacade.validate(plan);
		return change(plan, commitPlan(context, plan, {
			files: [],
			message: `docs: update task ${taskId}`,
			role: "scope-plan",
			scopeId: plan.scope?.id ?? null,
			taskId: null
		}));
	});
}
/** `accept`: records the user's acceptance; the scope stays open. */
function acceptScope(context, note) {
	return locked(context, () => {
		const plan = workflowPlanFacade.accept(readPlan(context), note, context.now());
		return change(plan, commitPlan(context, plan, {
			files: [],
			message: `chore: accept scope ${plan.scope?.id ?? "NONE"}`,
			role: "acceptance",
			scopeId: plan.scope?.id ?? null,
			taskId: null
		}));
	});
}
/** `close`: only from ACCEPTED, on a clean tree, by a direct user command. */
function closeScope(context, scopeId, note) {
	return locked(context, () => {
		const dirty = context.git.changes(context.root).all.filter((file) => !context.git.isKitManagedPath(file));
		ensure(dirty.length === 0, "DIRTY_TREE", "Close the scope on a clean working tree.", { paths: dirty });
		const plan = workflowPlanFacade.close(readPlan(context), scopeId, note, context.now());
		return change(plan, commitPlan(context, plan, {
			files: [],
			message: `chore: close scope ${scopeId}`,
			role: "close",
			scopeId,
			taskId: null
		}));
	});
}
/** `carryover`: moves unfinished tasks into a new scope. */
function carryoverScope(context, input) {
	return locked(context, () => {
		const plan = workflowPlanFacade.carryover(readPlan(context), input, transition(context));
		return change(plan, commitPlan(context, plan, {
			files: [],
			message: `chore: carry over into scope ${input.id}`,
			role: "carryover",
			scopeId: input.id,
			taskId: null
		}));
	});
}
/** `task:block` / `task:unblock`: the next Kit commit records the state. */
function setBlocked(context, reason) {
	return locked(context, () => {
		const current = readPlan(context);
		const plan = reason === null ? workflowPlanFacade.unblock(current) : workflowPlanFacade.block(current, reason);
		savePlan(context, plan);
		return change(plan, null);
	});
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-status.ts
function brief(task) {
	return task ? {
		id: task.id,
		kind: task.kind,
		roundId: task.roundId,
		status: task.status,
		title: task.title
	} : null;
}
function transactionOf(context) {
	const journal = context.git.transactions.journal(context.root);
	return journal ? {
		error: journal.error,
		id: journal.id,
		phase: journal.phase,
		role: journal.role,
		taskId: journal.taskId
	} : null;
}
/** Project status for the CLI, Core and the interface. */
function readStatus(context) {
	const plan = workflowPlanFacade.read(context.root);
	const config = workflowQualityFacade.readConfig(context.root);
	const repository = context.git.isRepository(context.root);
	const changes = repository ? context.git.changes(context.root).all.filter((file) => !context.git.isKitManagedPath(file)) : [];
	const tasks = plan?.tasks ?? [];
	return {
		changes,
		currentTask: brief(tasks.find((task) => task.id === plan?.currentTaskId)),
		head: repository ? context.git.head(context.root) : null,
		installed: plan !== null,
		nextTask: plan ? brief(workflowPlanFacade.nextTask(plan)) : null,
		progress: {
			done: tasks.filter((task) => task.status === "DONE").length,
			total: tasks.length
		},
		project: plan ? {
			id: plan.projectId,
			name: plan.projectName
		} : null,
		quality: {
			drift: workflowQualityFacade.drift(context.root, config),
			stacks: config.quality.stacks,
			status: config.quality.status
		},
		revision: plan?.revision ?? 0,
		rounds: (plan?.rounds ?? []).map(({ id, kind, status }) => ({
			id,
			kind,
			status
		})),
		scope: plan?.scope ? {
			blockedReason: plan.scope.blockedReason,
			delivery: plan.scope.delivery,
			id: plan.scope.id,
			objective: plan.scope.objective,
			status: plan.scope.status
		} : null,
		transaction: repository ? transactionOf(context) : null
	};
}
/** The status shape the autopilot decision reads. */
function autopilotStatus(context) {
	const status = readStatus(context);
	return {
		blockedReason: status.scope?.blockedReason ?? null,
		delivery: status.scope?.delivery ?? null,
		head: status.head,
		nextTask: status.nextTask,
		revision: status.revision,
		scope: status.scope?.status ?? "NONE",
		transactionPending: status.transaction !== null
	};
}
function collect(errors, action) {
	try {
		action();
		return true;
	} catch (error) {
		const { code, message } = error;
		errors.push({
			code: code ?? "ERROR",
			message
		});
		return false;
	}
}
/** `validate`: plan document, plan rules and the task-to-commit mapping. */
function validateProject(context) {
	const errors = [];
	let plan = null;
	collect(errors, () => {
		plan = workflowPlanFacade.read(context.root);
	});
	collect(errors, () => workflowQualityFacade.readConfig(context.root));
	if (plan) {
		const current = plan;
		collect(errors, () => context.git.resolveReferences(context.root, current, PLAN_PATH));
	} else if (errors.length === 0) errors.push({
		code: "NOT_INSTALLED",
		message: `${PLAN_PATH} does not exist.`
	});
	return {
		errors,
		ok: errors.length === 0
	};
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts
function briefOf(task) {
	const { id, kind, roundId, status, title } = task;
	return {
		id,
		kind,
		roundId,
		status,
		title
	};
}
function hasCommitChecks(config) {
	return config.quality.checks.some((check) => check.stage === "commit" && check.command);
}
/** `task:start`: checks, snapshot of earlier changes, IN_PROGRESS. */
function startTask(context, taskId, confirmation) {
	return locked(context, () => {
		ensureNoTransaction(context);
		const current = readPlan(context);
		const config = readConfig(context);
		const task = workflowPlanFacade.task(current, taskId);
		workflowQualityFacade.selectChecks({
			assigned: task.checks,
			config,
			root: context.root,
			stage: "commit"
		});
		const plan = workflowPlanFacade.startTask(current, taskId, confirmation);
		const baseline = context.git.beginTask(context.root, {
			iteration: task.iteration,
			scopeId: plan.scope?.id ?? "NONE",
			taskId
		});
		savePlan(context, plan);
		const warnings = [];
		const limit = config.policy.taskFileSoftLimit;
		const functional = task.files.filter((file) => !isDocumentationPath(file));
		if (limit !== null && functional.length > limit) warnings.push(`The task lists ${functional.length} functional files (soft limit ${limit}); consider splitting it.`);
		return {
			preexisting: baseline.preexisting,
			task: briefOf(workflowPlanFacade.task(plan, taskId)),
			warnings
		};
	});
}
/** Adds the prepare-stage report to the evidence of a finished commit. */
function storePrepareEvidence(context, sha, prepare) {
	const stored = workflowQualityFacade.readEvidence(context.root, sha);
	const evidence = {
		commit: sha,
		reports: [prepare, ...stored?.reports ?? []],
		transaction: stored?.transaction ?? null
	};
	const text = `${JSON.stringify(evidence, null, 2)}\n`;
	for (const name of [`${sha}.json`, "last.json"]) workflowPlatformFacade.writeFileAtomic(context.git.localPath(context.root, "verification", name), text);
}
function runPrepare(context, config, task, files) {
	if (!config.quality.checks.some((check) => check.stage === "prepare")) return null;
	const report = workflowQualityFacade.runStage({
		assigned: task.checks,
		config,
		env: context.env,
		files,
		root: context.root,
		stage: "prepare"
	});
	if (!report.ok) throw new WorkflowError("CHECK_FAILED", "A prepare check failed; nothing was committed.", { report }, "Fix the reported problem and repeat the same command.");
	return report;
}
/** `commit --task`: one task, one transactional commit. */
function commitTask(context, taskId, options = {}) {
	return locked(context, () => {
		ensureNoTransaction(context);
		const current = readPlan(context);
		const config = readConfig(context);
		const task = workflowPlanFacade.task(current, taskId);
		ensure(task.status === "IN_PROGRESS", "TASK_NOT_ACTIVE", `Start the task first: task:start ${taskId}`);
		ensure(task.kind !== "quality", "USE_QUALITY_APPLY", "The QUALITY task is completed by `quality:apply`.");
		ensure(task.kind !== "docs" || Boolean(options.digest), "ROUND_DIGEST_REQUIRED", `${taskId} closes its round: pass the round digest with --digest <file.json>.`);
		const identity = {
			iteration: task.iteration,
			scopeId: current.scope?.id ?? "NONE",
			taskId
		};
		const selection = context.git.selectTaskFiles(context.root, identity, options.files);
		const functional = selection.selected.filter((file) => !isDocumentationPath(file));
		ensure(functional.length === 0 || hasCommitChecks(config), "NOT_CONFIGURED", "Functional files need at least one commit-stage check in the quality profile.", { files: functional }, "Configure the profile with `quality:apply`.");
		const prepare = runPrepare(context, config, task, selection.selected);
		const withFiles = structuredClone(current);
		const own = workflowPlanFacade.task(withFiles, taskId);
		own.files = [.../* @__PURE__ */ new Set([...own.files, ...selection.selected])];
		const commit = commitPlan(context, workflowPlanFacade.completeTask(withFiles, taskId, options.digest ?? null), {
			checks: task.checks,
			excluded: selection.excluded,
			files: selection.selected,
			iteration: task.iteration,
			message: task.commitMessage,
			role: task.kind === "docs" ? "docs" : "implementation",
			scopeId: current.scope?.id ?? null,
			taskId
		});
		if (prepare) storePrepareEvidence(context, commit.sha, prepare);
		return {
			commit,
			nextTask: readStatus(context).nextTask,
			preexisting: selection.preexisting,
			prepare
		};
	});
}
/** `docs:commit`: documentation outside a task, with no scope or between tasks. */
function commitDocs(context, files, message = "docs: update documentation") {
	return locked(context, () => {
		const plan = readPlan(context);
		ensure(plan.currentTaskId === null, "TASK_IN_PROGRESS", `Task ${plan.currentTaskId} is in progress; its documents go into its commit.`);
		const paths = files.map((file) => workflowPlatformFacade.normalizeRelative(file));
		const code = paths.filter((file) => !isDocumentationPath(file));
		ensure(paths.length > 0 && code.length === 0, "DOCS_ONLY", "docs:commit takes Markdown documents only.", { paths: code });
		return commitPlan(context, plan, {
			files: paths,
			message,
			role: "docs",
			scopeId: plan.scope?.id ?? null,
			taskId: null
		});
	});
}
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts
/**
* Cluster facade of `core-runtime/clusters/project-workflow`: every process
* operation of the Workflow Kit on one project root.
*/
var WorkflowKitFacade = class {
	env;
	git;
	installer;
	recovery;
	now;
	constructor(options = {}) {
		this.env = options.env ?? process.env;
		this.git = options.git ?? workflowGitFacade;
		this.now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
		this.recovery = new WorkflowRecoveryFacade(this.git);
		this.installer = new WorkflowInstallerFacade(this.git);
	}
	context(root) {
		return {
			env: this.env,
			git: this.git,
			now: this.now,
			root
		};
	}
	/** `inspect <path>`: folder state and the action to offer. */
	inspect(folder) {
		return this.installer.inspect(folder);
	}
	/** `doctor [--fix]`: project health; fixes only fixable findings. */
	doctor(folder, options = {}) {
		return this.installer.doctor(folder, {
			env: this.env,
			...options
		});
	}
	/** `migrate:harness-plan`: a legacy Harness plan becomes a Kit plan. */
	migrateHarnessPlan(folder, options) {
		return this.installer.migrateHarnessPlan(folder, {
			...options,
			now: this.now()
		});
	}
	/** `install <path> [--update]`. */
	install(folder, options) {
		return this.installer.install(folder, options);
	}
	status(root) {
		return readStatus(this.context(root));
	}
	validate(root) {
		return validateProject(this.context(root));
	}
	autopilotStatus(root) {
		return autopilotStatus(this.context(root));
	}
	recover(root, event = "startup") {
		return this.recovery.packet(root, event);
	}
	showTask(root, taskId) {
		return this.recovery.showTask(root, taskId);
	}
	history(root, filter = {}) {
		return this.recovery.history(root, filter);
	}
	sessionStart(root, client, stdin) {
		return this.recovery.sessionStart(root, {
			client,
			env: this.env,
			stdin
		});
	}
	createScope(root, input) {
		return createScope(this.context(root), input);
	}
	extend(root, input, expectedRevision) {
		return extendScope(this.context(root), input, expectedRevision);
	}
	updateTask(root, taskId, patch, expectedRevision) {
		return updateTask(this.context(root), taskId, patch, expectedRevision);
	}
	accept(root, note) {
		return acceptScope(this.context(root), note);
	}
	close(root, scopeId, note) {
		return closeScope(this.context(root), scopeId, note);
	}
	carryover(root, input) {
		return carryoverScope(this.context(root), input);
	}
	block(root, reason) {
		return setBlocked(this.context(root), reason);
	}
	unblock(root) {
		return setBlocked(this.context(root), null);
	}
	startTask(root, taskId, confirmation = null) {
		return startTask(this.context(root), taskId, confirmation);
	}
	commitTask(root, taskId, options = {}) {
		return commitTask(this.context(root), taskId, options);
	}
	commitDocs(root, files, message) {
		return commitDocs(this.context(root), files, message);
	}
	qualityDetect(root, stacks) {
		return detectQuality(this.context(root), stacks);
	}
	qualityApply(root, input) {
		return applyQuality(this.context(root), input);
	}
	qualityStatus(root) {
		return qualityStatus(this.context(root));
	}
	/** `git-hook <name>`: handlers of the managed git hooks. */
	gitHook(root, name, args = []) {
		return runGitHook(this.context(root), name, args);
	}
	repair(root, options = {}) {
		return repair(this.context(root), options);
	}
};
new WorkflowKitFacade();
//#endregion
//#region product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts
var EVENTS = /* @__PURE__ */ new Set([
	"startup",
	"resume",
	"clear",
	"compact"
]);
function resolvePath(io, value) {
	return path.resolve(io.cwd, value ?? ".");
}
/** The bundle to install (this file unless `--bundle`) and the running runtime. */
function ownBundle(args, io) {
	return {
		bundle: readFileSync(resolvePath(io, flag(args, "bundle") ?? fileURLToPath(import.meta.url)), "utf8"),
		runtime: {
			executable: process.execPath,
			mode: process.versions.electron ? "electron" : "node"
		}
	};
}
var COMMANDS = {
	"autopilot:status": {
		run: ({ kit, root }) => kit.autopilotStatus(root),
		usage: "autopilot:status"
	},
	accept: {
		run: ({ args, kit, root }) => kit.accept(root, requiredFlag(args, "note")),
		usage: "accept --note \"<the user's words>\""
	},
	carryover: {
		run: ({ args, io, kit, root }) => kit.carryover(root, readJsonFile(io.cwd, requiredFlag(args, "input"))),
		usage: "carryover --input <file.json>"
	},
	close: {
		run: ({ args, kit, root }) => kit.close(root, requiredFlag(args, "scope"), requiredFlag(args, "note")),
		usage: "close --scope <id> --note \"<direct user command>\""
	},
	commit: {
		run: ({ args, io, kit, root }) => {
			const digest = flag(args, "digest");
			return kit.commitTask(root, requiredFlag(args, "task"), {
				digest: digest ? readJsonFile(io.cwd, digest) : null,
				files: listFlag(args, "files")
			});
		},
		usage: "commit --task <ID> [--files <json|a,b>] [--digest <file.json>]"
	},
	"docs:commit": {
		run: ({ args, kit, root }) => {
			const files = listFlag(args, "files");
			if (!files) throw new WorkflowError("USAGE", "--files is required.");
			return kit.commitDocs(root, files, flag(args, "message"));
		},
		usage: "docs:commit --files <json|a,b> [--message \"docs: ...\"]"
	},
	inspect: {
		run: ({ args, io, kit }) => kit.inspect(resolvePath(io, args.positionals[0])),
		usage: "inspect [<path>]"
	},
	doctor: {
		run: ({ args, io, kit }) => kit.doctor(resolvePath(io, args.positionals[0]), { fix: args.flags.get("fix") === true ? ownBundle(args, io) : null }),
		usage: "doctor [<path>] [--fix] [--bundle <workflow.mjs>]"
	},
	install: {
		run: ({ args, io, kit }) => kit.install(resolvePath(io, args.positionals[0]), {
			...ownBundle(args, io),
			name: flag(args, "name"),
			update: args.flags.get("update") === true
		}),
		usage: "install [<path>] [--name <project name>] [--update] [--bundle <workflow.mjs>]"
	},
	history: {
		run: ({ args, kit, root }) => kit.history(root, {
			round: flag(args, "round"),
			task: flag(args, "task")
		}),
		usage: "history [--task <ID>] [--round <R>]"
	},
	"migrate:harness-plan": {
		run: ({ args, io, kit }) => kit.migrateHarnessPlan(resolvePath(io, args.positionals[0]), {
			message: flag(args, "message"),
			name: flag(args, "name"),
			objective: flag(args, "objective"),
			spec: flag(args, "spec") ?? null
		}),
		usage: "migrate:harness-plan [<path>] [--message \"chore: ...\"] [--objective \"...\"] [--spec <doc.md>] [--name <project name>]"
	},
	"plan:extend": {
		run: ({ args, io, kit, root }) => kit.extend(root, readJsonFile(io.cwd, requiredFlag(args, "input")), integerFlag(args, "expected-revision")),
		usage: "plan:extend --input <file.json> [--expected-revision N]"
	},
	"quality:apply": {
		run: ({ args, io, kit, root }) => kit.qualityApply(root, readJsonFile(io.cwd, requiredFlag(args, "input"))),
		usage: "quality:apply --input <profile.json>"
	},
	"quality:detect": {
		run: ({ args, kit, root }) => kit.qualityDetect(root, listFlag(args, "stack")),
		usage: "quality:detect [--stack node,python]"
	},
	"quality:status": {
		run: ({ kit, root }) => kit.qualityStatus(root),
		usage: "quality:status"
	},
	recover: {
		run: ({ args, kit, root }) => {
			const event = flag(args, "event") ?? "startup";
			if (!EVENTS.has(event)) throw new WorkflowError("USAGE", "--event is startup, resume, clear or compact.");
			return kit.recover(root, event);
		},
		usage: "recover [--event startup|resume|clear|compact]"
	},
	repair: {
		run: ({ args, kit, root }) => kit.repair(root, {
			apply: flag(args, "apply"),
			cancel: flag(args, "cancel")
		}),
		usage: "repair [--apply <repairId> | --cancel <repairId>]"
	},
	"scope:create": {
		run: ({ args, io, kit, root }) => kit.createScope(root, readJsonFile(io.cwd, requiredFlag(args, "input"))),
		usage: "scope:create --input <file.json>"
	},
	"show-task": {
		run: ({ args, kit, root }) => ({ text: kit.showTask(root, positional(args, 0, "Task id")) }),
		usage: "show-task <ID>"
	},
	status: {
		run: ({ kit, root }) => kit.status(root),
		usage: "status"
	},
	"task:block": {
		run: ({ args, kit, root }) => kit.block(root, requiredFlag(args, "reason")),
		usage: "task:block --reason \"<text>\""
	},
	"task:start": {
		run: ({ args, kit, root }) => kit.startTask(root, positional(args, 0, "Task id"), flag(args, "confirmed") ?? null),
		usage: "task:start <ID> [--confirmed \"<user confirmation>\"]"
	},
	"task:unblock": {
		run: ({ kit, root }) => kit.unblock(root),
		usage: "task:unblock"
	},
	"task:update": {
		run: ({ args, io, kit, root }) => kit.updateTask(root, positional(args, 0, "Task id"), readJsonFile(io.cwd, requiredFlag(args, "input")), integerFlag(args, "expected-revision")),
		usage: "task:update <ID> --input <patch.json> [--expected-revision N]"
	},
	validate: {
		run: ({ kit, root }) => kit.validate(root),
		usage: "validate"
	}
};
function helpText() {
	return [
		"Workflow Kit — the project development process.",
		"",
		"Usage:",
		...Object.entries(COMMANDS).sort(([left], [right]) => left.localeCompare(right)).map(([, spec]) => `  scripts/workflow ${spec.usage}`),
		"  scripts/workflow hook session-start --client claude|codex",
		"  scripts/workflow git-hook <pre-commit|commit-msg|post-commit|pre-push> [args]",
		"",
		"Options: --format json|text (default json), --root <project>.",
		"Errors: {\"ok\":false,\"code\",\"message\",\"nextAction\"} and exit code 1.",
		""
	].join("\n");
}
function projectRoot(args, io, kit) {
	const explicit = flag(args, "root") ?? io.env.HARNESS_WORKFLOW_ROOT;
	if (explicit) return explicit;
	return kit.git.isRepository(io.cwd) ? kit.git.topLevel(io.cwd) : io.cwd;
}
function errorEnvelope(error) {
	if (error instanceof WorkflowError) return {
		code: error.code,
		details: error.details,
		message: error.message,
		nextAction: error.nextAction ?? null,
		ok: false
	};
	return {
		code: "INTERNAL",
		message: error?.message ?? String(error),
		nextAction: null,
		ok: false
	};
}
function runHook(args, io, kit, root) {
	if (args.command === "hook") {
		const client = flag(args, "client");
		if (positional(args, 0, "Hook name") !== "session-start" || client !== "claude" && client !== "codex") throw new WorkflowError("USAGE", "hook session-start --client claude|codex");
		io.stdout(kit.sessionStart(root, client, io.readStdin()));
		return 0;
	}
	const result = kit.gitHook(root, positional(args, 0, "Hook name"), args.positionals.slice(1));
	if (result.message) io.stderr(`${result.message}\n`);
	return result.exitCode;
}
function dispatch(args, io, kit, format) {
	const command = args.command ?? "help";
	const root = projectRoot(args, io, kit);
	if (command === "hook" || command === "git-hook") return runHook(args, io, kit, root);
	const spec = COMMANDS[command];
	if (!spec) throw new WorkflowError("UNKNOWN_COMMAND", `Unknown command: ${command}`, {}, "Run `scripts/workflow help`.");
	const result = spec.run({
		args,
		io,
		kit,
		root
	});
	io.stdout(format === "text" ? renderText(command, result) : `${JSON.stringify({
		command,
		ok: true,
		result
	}, null, 2)}\n`);
	return 0;
}
function writeFailure(io, error, format) {
	const envelope = errorEnvelope(error);
	if (format === "text") io.stderr(`${envelope.code}: ${envelope.message}${envelope.nextAction ? `\nNext: ${envelope.nextAction}` : ""}\n`);
	else io.stdout(`${JSON.stringify(envelope, null, 2)}\n`);
}
/** Runs one Kit command; returns the process exit code. */
function runCli(argv, io, kit) {
	const facade = kit ?? new WorkflowKitFacade({ env: io.env });
	let format = "json";
	try {
		const args = parseArgs(argv);
		format = flag(args, "format") ?? "json";
		const wantsHelp = args.command === "help" || args.flags.get("help") === true;
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
function readProcessStdin() {
	if (process.stdin.isTTY) return "";
	try {
		return readFileSync(0, "utf8");
	} catch {
		return "";
	}
}
function invokedDirectly() {
	const entry = process.argv[1];
	if (!entry) return false;
	try {
		return pathToFileURL(realpathSync(entry)).href === import.meta.url;
	} catch {
		return false;
	}
}
if (invokedDirectly()) process.exitCode = runCli(process.argv.slice(2), {
	cwd: process.cwd(),
	env: process.env,
	readStdin: readProcessStdin,
	stderr: (text) => process.stderr.write(text),
	stdout: (text) => process.stdout.write(text)
});
//#endregion
export { runCli };
