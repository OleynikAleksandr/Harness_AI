#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Maps a changed module source file to the module directory that owns it.
const MODULE_SRC_RE = /^(product-parts\/.+?\/modules\/[^/]+)\/src\//u;
// Only behavior/contract code triggers the gate. Styles/markup/assets under
// src (e.g. .css) are presentation and do not require a module.md update.
const CODE_EXT_RE = /\.(?:ts|tsx|mjs|cjs|js|jsx)$/u;
const SKIP_MARKER = "[skip-docs]";

export function hasSkipMarker(message) {
  return message.includes(SKIP_MARKER);
}

// Given the staged file list, return module dirs whose src changed but whose
// own module.md was not also staged. Those modules have stale documentation.
export function modulesMissingDoc(staged) {
  const stagedSet = new Set(staged);
  const modules = new Set();
  for (const file of staged) {
    const match = file.match(MODULE_SRC_RE);
    if (match && CODE_EXT_RE.test(file)) {
      modules.add(match[1]);
    }
  }
  return [...modules].filter((dir) => !stagedSet.has(`${dir}/module.md`));
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
  if (messageFile && existsSync(messageFile)) {
    const message = readFileSync(messageFile, "utf8");
    if (hasSkipMarker(message)) {
      console.log("Docs sync: skipped via [skip-docs].");
      return;
    }
  }
  const missing = modulesMissingDoc(stagedFiles());
  if (missing.length > 0) {
    console.error(
      `Docs sync: module source changed without updating its module.md:\n${missing
        .map((dir) => `  - ${dir}/module.md`)
        .join(
          "\n"
        )}\nUpdate each module.md to match the new behavior, and update docs/architecture/** or .harness/product-tree/** if structure or contracts changed. If this change truly does not affect documentation, add ${SKIP_MARKER} to the commit message.`
    );
    process.exit(1);
  }
  console.log("Docs sync: OK");
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
