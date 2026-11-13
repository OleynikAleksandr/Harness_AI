import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createBuildInfo, writeBuildInfo } from "./build-release-info.mjs";

assert.deepEqual(createBuildInfo("v2026.11.13"), {
  applicationVersion: "2026.11.13",
  buildNumber: "1",
  channel: "release",
  releaseTag: "v2026.11.13",
  releaseVersion: "2026.11.13",
  schema: "harness-build-info/1",
});
assert.equal(createBuildInfo("v2026.11.13.2").buildNumber, "2");
assert.equal(createBuildInfo("v2026.11.13.2").applicationVersion, "2026.11.13");
assert.equal(createBuildInfo("v2024.2.29").releaseVersion, "2024.2.29");
const INVALID_TAG_MESSAGE = /HARNESS_RELEASE_TAG/u;
for (const invalid of [
  "2026.11.13",
  "v2026.02.13",
  "v2026.2.29",
  "v2026.4.31",
  "v2026.11.13.1",
  "v2026.11.13.0",
  "v2026.11.13.02",
  "v2026.11.13.10000",
  "v2026.11.13.2-extra",
  " v2026.11.13",
]) {
  assert.throws(() => createBuildInfo(invalid), {
    message: INVALID_TAG_MESSAGE,
  });
}
const root = mkdtempSync(path.join(tmpdir(), "harness-release-info-"));
try {
  writeBuildInfo(root, "v2026.11.13.2");
  writeBuildInfo(root, undefined);
  const dev = JSON.parse(
    readFileSync(path.join(root, "dist/build-info.json"), "utf8")
  );
  assert.equal(dev.channel, "development");
  assert.equal(dev.releaseVersion, "Development");
  assert.equal(dev.releaseTag, null);
  assert.equal(dev.applicationVersion, null);
  assert.equal(dev.buildNumber, null);
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log("Release metadata tests passed");
