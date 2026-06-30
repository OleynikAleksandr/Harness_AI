#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  packagedAppContentsPath,
  parseProcessList,
  selectPackagedHarnessProcesses,
} from "./stop-packaged-app-processes.mjs";

const repoRoot = "/Users/example/VSCODE/harness-ai";
const appContentsPath = packagedAppContentsPath(repoRoot);

const parsed = parseProcessList(`
  101     1 /Applications/Other.app/Contents/MacOS/Harness AI
  202     1 ${appContentsPath}/MacOS/Harness AI ${appContentsPath}/Resources/app.asar/dist/runtime/core-runtime-process-entry.js
  303   202 ${appContentsPath}/MacOS/Harness AI --child
  404     1 electron product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/main.mjs
  505     1 /Users/example/VSCODE/other/release/mac-arm64/Harness AI.app/Contents/MacOS/Harness AI
`);

assert.equal(parsed.length, 5);
assert.deepEqual(
  selectPackagedHarnessProcesses(parsed, {
    currentPid: 999,
    repoRoot,
  }).map((entry) => entry.pid),
  [202, 303]
);

assert.deepEqual(
  selectPackagedHarnessProcesses(parsed, {
    currentPid: 202,
    repoRoot,
  }).map((entry) => entry.pid),
  [303]
);

console.log("stop-packaged-app-processes tests: OK");
