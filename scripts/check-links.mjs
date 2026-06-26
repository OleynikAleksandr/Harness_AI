#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const LOCAL_MARKDOWN_LINK_REGEX = /\[[^\]]+\]\(([^)]+)\)/gu;
const SKIP_LINK_TARGET_REGEX = /^(https?:|mailto:|vscode:|#)/u;
const TRACKED_MARKDOWN_ARGS = [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "*.md",
];

function listMarkdownFiles() {
  const result = spawnSync("git", TRACKED_MARKDOWN_ARGS, { encoding: "utf8" });
  if (result.status === 0) {
    return result.stdout.split("\n").filter(Boolean);
  }
  return walk(".");
}

function walk(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, result);
    } else if (path.endsWith(".md")) {
      result.push(path);
    }
  }
  return result;
}

const issues = [];
for (const file of listMarkdownFiles()) {
  const text = readFileSync(file, "utf8");
  const matches = text.matchAll(LOCAL_MARKDOWN_LINK_REGEX);
  for (const match of matches) {
    const target = match[1];
    if (SKIP_LINK_TARGET_REGEX.test(target)) {
      continue;
    }
    const cleanTarget = target.split("#")[0];
    if (!cleanTarget) {
      continue;
    }
    const resolved = normalize(join(dirname(file), cleanTarget));
    if (!existsSync(resolved)) {
      issues.push(`${file}: missing link target ${target}`);
    }
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("Link check: OK");
