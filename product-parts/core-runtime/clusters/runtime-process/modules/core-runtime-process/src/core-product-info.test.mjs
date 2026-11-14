import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createBuildInfo } from "../../../../../../../scripts/build-release-info.mjs";
import { buildWorkflowModules } from "../../../../project-workflow/modules/workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(["workflow-kit"], "core-product-info");
try {
  const source = readFileSync(
    new URL("./core-product-info.ts", import.meta.url),
    "utf8"
  ).replace(
    "../../../../project-workflow/modules/workflow-kit/src/workflow-kit-facade.js",
    pathToFileURL(
      path.join(build.directory, "workflow-kit/src/workflow-kit-facade.js")
    ).href
  );
  const target = path.join(build.directory, "core-product-info.js");
  writeFileSync(
    target,
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
  );
  const { readProductInfo } = await import(pathToFileURL(target).href);
  const metadata = path.join(build.directory, "build-info.json");
  const write = (value) => writeFileSync(metadata, JSON.stringify(value));
  write(createBuildInfo("v2026.11.13.2"));
  assert.deepEqual(readProductInfo(metadata), {
    applicationVersion: "2026.11.13.2",
    buildNumber: "2",
    channel: "release",
    releaseTag: "v2026.11.13.2",
    workflowKitVersion: "2.2.5",
  });
  assert.ok(Object.isFrozen(readProductInfo(metadata)));
  // A project manifest cannot replace the Kit compiled into the application.
  const project = path.join(build.directory, "project/.harness/workflow");
  mkdirSync(project, { recursive: true });
  writeFileSync(
    path.join(project, "manifest.json"),
    JSON.stringify({ version: "1.0.0" })
  );
  assert.equal(readProductInfo(metadata).workflowKitVersion, "2.2.5");
  for (const change of [
    { schema: "other" },
    { releaseVersion: "0.0.0" },
    { applicationVersion: "2026.11.12" },
    { buildNumber: "1" },
    { releaseTag: null },
    { channel: "unknown" },
  ]) {
    write({ ...createBuildInfo("v2026.11.13.2"), ...change });
    assert.throws(() => readProductInfo(metadata));
  }
  write({
    ...createBuildInfo("v2026.11.13"),
    releaseTag: "v2026.2.29",
    releaseVersion: "2026.2.29",
    applicationVersion: "2026.2.29",
  });
  assert.throws(() => readProductInfo(metadata));
  write(createBuildInfo(undefined));
  assert.equal(readProductInfo(metadata).applicationVersion, "Development");
  write({ ...createBuildInfo(undefined), releaseTag: "v2026.11.13" });
  assert.throws(() => readProductInfo(metadata));
  writeFileSync(metadata, "not JSON");
  assert.throws(() => readProductInfo(metadata));
  assert.throws(() =>
    readProductInfo(path.join(build.directory, "missing.json"))
  );
} finally {
  await build.cleanup();
}
console.log("Core product information tests passed");
