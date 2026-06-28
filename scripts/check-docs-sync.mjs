#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Source code whose change must be reflected in documentation.
const CODE_RE = /^(?:product-parts|scripts)\/.*\.(?:ts|tsx|mjs|cjs|js|jsx)$/u;
// Documentation that describes the code (NOT the plan or evidence logs).
const DOC_RE =
  /^(?:product-parts\/.*\.md|docs\/architecture\/.*\.md|\.harness\/product-tree\/.*|AGENTS\.md|README\.md)$/u;
// Extracts part/cluster/module from a changed module source file.
const MODULE_SRC_RE =
  /^product-parts\/([^/]+)\/clusters\/([^/]+)\/modules\/([^/]+)\/src\//u;
const SKIP_MARKER = "[skip-docs]";

export function hasSkipMarker(message) {
  return message.includes(SKIP_MARKER);
}

export function codeChanges(staged) {
  return staged.filter((file) => CODE_RE.test(file));
}

export function docChanges(staged) {
  return staged.filter((file) => DOC_RE.test(file));
}

// The specific module/cluster/part docs that own the changed source files.
export function moduleDocTargets(codeFiles) {
  const targets = new Set();
  for (const file of codeFiles) {
    const match = file.match(MODULE_SRC_RE);
    if (match) {
      const [, part, cluster, module] = match;
      const base = `product-parts/${part}`;
      targets.add(`${base}/clusters/${cluster}/modules/${module}/module.md`);
      targets.add(`${base}/clusters/${cluster}/cluster.md`);
      targets.add(`${base}/product-part.md`);
    }
  }
  return [...targets];
}

function buildInstruction(codeFiles) {
  const moduleTargets = moduleDocTargets(codeFiles);
  const always = [
    "docs/architecture/** — cross-cutting architecture docs",
    ".harness/product-tree/product-tree.json + product-tree.md — part/cluster/module structure",
    "AGENTS.md — if commands, gates, scripts, or process changed",
  ];
  const moduleBlock = moduleTargets.length
    ? `Docs owning the changed modules:\n${moduleTargets
        .map((target) => `  - ${target}`)
        .join("\n")}\n\n`
    : "";
  return [
    "Docs sync: this commit changes source code, so documentation may be stale.",
    "Before committing, review each path below and make it match the current code:",
    "",
    `${moduleBlock}Always review:\n${always.map((a) => `  - ${a}`).join("\n")}`,
    "",
    "Then stage the docs you updated and commit again.",
    `If this change truly affects no documentation, add ${SKIP_MARKER} to the commit message.`,
  ].join("\n");
}

function stagedFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    { encoding: "utf8" }
  );
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function run(messageFile) {
  if (
    messageFile &&
    existsSync(messageFile) &&
    hasSkipMarker(readFileSync(messageFile, "utf8"))
  ) {
    console.log("Docs sync: skipped via [skip-docs].");
    return;
  }
  const staged = stagedFiles();
  const code = codeChanges(staged);
  if (code.length === 0) {
    console.log("Docs sync: no source code changed.");
    return;
  }
  if (docChanges(staged).length > 0) {
    console.log("Docs sync: documentation updated alongside code.");
    return;
  }
  console.error(buildInstruction(code));
  process.exit(1);
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (invokedDirectly) {
  try {
    run(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
