#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createBuildInfo } from "./build-release-info.mjs";

const info = createBuildInfo(process.env.HARNESS_RELEASE_TAG);
if (info.channel !== "release") {
  throw new Error("Packaging requires HARNESS_RELEASE_TAG=vYYYY.M.D[.N].");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" },
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "package:stop-old"]);
run("npm", ["run", "build"]);
run(process.execPath, [
  path.resolve("node_modules/electron-builder/cli.js"),
  "--mac",
  "dir",
  "--publish",
  "never",
  `--config.extraMetadata.version=${info.applicationVersion}`,
  `--config.buildVersion=${info.buildNumber}`,
]);
