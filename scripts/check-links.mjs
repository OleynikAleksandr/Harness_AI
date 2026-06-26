#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

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
for (const file of walk(".")) {
  const text = readFileSync(file, "utf8");
  const matches = text.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu);
  for (const match of matches) {
    const target = match[1];
    if (/^(https?:|mailto:|vscode:|#)/u.test(target)) {
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
