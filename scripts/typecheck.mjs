#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tsc = "node_modules/.bin/tsc";
if (!existsSync(tsc)) {
  console.log("Typecheck: TypeScript is not installed yet");
  process.exit(0);
}

const result = spawnSync(tsc, ["--noEmit"], { stdio: "inherit" });
process.exit(result.status ?? 1);
