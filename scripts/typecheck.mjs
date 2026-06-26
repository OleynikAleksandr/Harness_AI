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
    } else if (/\.(ts|tsx)$/u.test(path)) {
      result.push(path);
    }
  }
  return result;
}

const files = walk("product-parts");
if (files.length === 0) {
  console.log("Typecheck: no TypeScript implementation files yet");
  process.exit(0);
}

const tsc = "node_modules/.bin/tsc";
if (!existsSync(tsc)) {
  console.log("Typecheck: TypeScript is not installed yet");
  process.exit(0);
}

const result = spawnSync(tsc, ["--noEmit"], { stdio: "inherit" });
process.exit(result.status ?? 1);
