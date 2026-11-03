#!/usr/bin/env node
// Builds the standalone Workflow Kit bundle (dist/workflow-kit/workflow.mjs)
// and smoke-tests it: help, status of a fresh folder, the error envelope and
// an installation whose hooks and launcher run the bundle end to end.
// The bundle may import Node built-ins only.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  // End to end: install into a new git project; the installed hooks and
  // launcher run this bundle for the bootstrap commit.
  const project = path.join(folder, "project");
  const gitConfig = path.join(folder, "gitconfig");
  writeFileSync(
    gitConfig,
    "[user]\n\tname = Workflow Smoke\n\temail = smoke@example.invalid\n"
  );
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: gitConfig,
    GIT_CONFIG_NOSYSTEM: "1",
  };
  for (const name of [
    "GIT_DIR",
    "GIT_INDEX_FILE",
    "GIT_WORK_TREE",
    "GIT_PREFIX",
  ]) {
    delete env[name];
  }
  const install = spawnSync(
    process.execPath,
    [BUNDLE, "install", project, "--name", "Smoke"],
    { cwd: folder, encoding: "utf8", env }
  );
  const installed = spawnSync(
    path.join(project, "scripts", "workflow"),
    ["validate"],
    { cwd: project, encoding: "utf8", env }
  );
  if (
    install.status !== 0 ||
    JSON.parse(install.stdout).result.commit === null
  ) {
    problems.push(
      `install: ${install.status} ${install.stdout}${install.stderr}`
    );
  } else if (
    installed.status !== 0 ||
    JSON.parse(installed.stdout).result.ok !== true
  ) {
    problems.push(
      `installed launcher: ${installed.status} ${installed.stdout}${installed.stderr}`
    );
  } else {
    const doctor = spawnSync(
      path.join(project, "scripts", "workflow"),
      ["doctor"],
      { cwd: project, encoding: "utf8", env }
    );
    if (doctor.status !== 0 || JSON.parse(doctor.stdout).result.ok !== true) {
      problems.push(
        `doctor: ${doctor.status} ${doctor.stdout}${doctor.stderr}`
      );
    }
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
