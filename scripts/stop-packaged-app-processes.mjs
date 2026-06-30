#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_GRACE_MS = 2000;
const PROCESS_LINE_RE = /^(\d+)\s+(\d+)\s+(.+)$/u;
const SIGNAL_CHECK_ERROR_CODES = new Set(["EPERM"]);

export function parseProcessList(text) {
  return text
    .split("\n")
    .map((line) => line.trimStart())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(PROCESS_LINE_RE);
      if (!match) {
        return null;
      }
      return {
        command: match[3],
        pid: Number(match[1]),
        ppid: Number(match[2]),
      };
    })
    .filter((entry) => entry && Number.isInteger(entry.pid));
}

export function packagedAppContentsPath(repoRoot = process.cwd()) {
  return resolve(repoRoot, "release/mac-arm64/Harness AI.app/Contents");
}

export function selectPackagedHarnessProcesses(
  processes,
  { currentPid = process.pid, repoRoot = process.cwd() } = {}
) {
  const contentsPath = packagedAppContentsPath(repoRoot);
  return processes.filter(
    (entry) => entry.pid !== currentPid && entry.command.includes(contentsPath)
  );
}

function readProcessList() {
  return execFileSync("ps", ["-axo", "pid=,ppid=,command="], {
    encoding: "utf8",
  });
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      SIGNAL_CHECK_ERROR_CODES.has(error.code)
    ) {
      return true;
    }
    return false;
  }
}

function sendSignal(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(processes, graceMs) {
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    const remaining = processes.filter((entry) => isProcessAlive(entry.pid));
    if (remaining.length === 0) {
      return [];
    }
    await delay(100);
  }
  return processes.filter((entry) => isProcessAlive(entry.pid));
}

export async function stopPackagedHarnessProcesses({
  graceMs = DEFAULT_GRACE_MS,
  logger = console,
  repoRoot = process.cwd(),
} = {}) {
  const processes = parseProcessList(readProcessList());
  const targets = selectPackagedHarnessProcesses(processes, { repoRoot });
  if (targets.length === 0) {
    logger.log("No running packaged Harness AI app processes found.");
    return { killed: [], signalKilled: [] };
  }

  logger.log(
    `Stopping packaged Harness AI app processes: ${targets
      .map((entry) => entry.pid)
      .join(", ")}`
  );
  for (const target of targets) {
    sendSignal(target.pid, "SIGTERM");
  }

  const remaining = await waitForExit(targets, graceMs);
  for (const target of remaining) {
    sendSignal(target.pid, "SIGKILL");
  }

  return {
    killed: targets.map((entry) => entry.pid),
    signalKilled: remaining.map((entry) => entry.pid),
  };
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (invokedDirectly) {
  await stopPackagedHarnessProcesses();
}
