#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const EXTENSIONS = new Set([".json", ".md", ".mjs", ".js", ".ts", ".tsx"]);

function walk(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules" || entry === "runtime") {
      continue;
    }
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, result);
    } else {
      result.push(path);
    }
  }
  return result;
}

function extension(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

const issues = [];
for (const file of walk(".")) {
  if (!EXTENSIONS.has(extension(file))) {
    continue;
  }
  const text = readFileSync(file, "utf8");
  if (text.includes("\r\n")) {
    issues.push(`${file}: CRLF line endings`);
  }
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (/[ \t]+$/u.test(line)) {
      issues.push(`${file}:${index + 1}: trailing whitespace`);
    }
  });
  if (file.endsWith(".json")) {
    JSON.parse(text);
  }
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log("Lint: OK");
