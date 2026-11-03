#!/usr/bin/env node
// Builds the standalone Workflow Kit bundle (dist/workflow-kit/workflow.mjs)
// and smoke-tests it: help, status of a fresh folder and the error envelope.
// The bundle may import Node built-ins only.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "vite";

const BUNDLE = path.resolve("dist/workflow-kit/workflow.mjs");
const IMPORT_PATTERN = /^\s*import\s[^"']*["']([^"']+)["']/gmu;

await build({ configFile: "vite.workflow-kit.config.ts", logLevel: "warn" });

const source = readFileSync(BUNDLE, "utf8");
const foreign = [...source.matchAll(IMPORT_PATTERN)]
  .map((match) => match[1])
  .filter((specifier) => !specifier.startsWith("node:"));
if (foreign.length > 0) {
  console.error(
    `Workflow Kit bundle imports non-builtin modules: ${foreign.join(", ")}`
  );
  process.exit(1);
}

function run(args, cwd) {
  return spawnSync(process.execPath, [BUNDLE, ...args], {
    cwd,
    encoding: "utf8",
  });
}

const folder = mkdtempSync(path.join(tmpdir(), "workflow-kit-smoke-"));
try {
  const help = run(["help"], folder);
  const status = run(["status", "--root", folder], folder);
  const missing = run(["validate", "--root", folder], folder);
  const problems = [];
  if (help.status !== 0 || !help.stdout.includes("Usage:")) {
    problems.push(`help: ${help.status} ${help.stderr}`);
  }
  if (
    status.status !== 0 ||
    JSON.parse(status.stdout).result.installed !== false
  ) {
    problems.push(`status: ${status.status} ${status.stdout}${status.stderr}`);
  }
  if (
    missing.status !== 0 ||
    JSON.parse(missing.stdout).result.errors[0]?.code !== "NOT_INSTALLED"
  ) {
    problems.push(
      `validate: ${missing.status} ${missing.stdout}${missing.stderr}`
    );
  }
  if (problems.length > 0) {
    console.error(
      `Workflow Kit bundle smoke test failed:\n${problems.join("\n")}`
    );
    process.exit(1);
  }
} finally {
  rmSync(folder, { force: true, recursive: true });
}
console.log(
  `Workflow Kit bundle: ${path.relative(process.cwd(), BUNDLE)} (${Math.round(source.length / 1024)} KB)`
);
