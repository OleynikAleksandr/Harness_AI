#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function walk(dir, result = []) {
  if (!existsSync(dir)) {
    return result;
  }
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, result);
    } else if (/\.test\.mjs$/u.test(path)) {
      result.push(path);
    }
  }
  return result;
}

const tests = [...walk("scripts"), ...walk("product-parts")];
if (tests.length === 0) {
  console.log("Tests: no runnable tests yet");
  process.exit(0);
}

for (const test of tests) {
  const result = spawnSync("node", [test], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Tests: OK (${tests.length})`);
