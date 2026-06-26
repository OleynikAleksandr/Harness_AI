#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const tsc = "node_modules/.bin/tsc";
if (!existsSync(tsc)) {
  console.log("Typecheck: TypeScript is not installed yet");
  process.exit(0);
}

const result = spawnSync(tsc, ["--noEmit"], { stdio: "inherit" });
process.exit(result.status ?? 1);
