import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const buildDir = await mkdtemp(path.join(tmpdir(), "core-claude-sdk-updates-"));
const toolsSource = readFileSync(
  new URL("./core-provider-tools.ts", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("./core-runtime-api.ts", import.meta.url),
  "utf8"
);

try {
  writeFileSync(
    path.join(buildDir, "core-claude-sdk-updates.js"),
    ts.transpileModule(
      readFileSync(
        new URL("./core-claude-sdk-updates.ts", import.meta.url),
        "utf8"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    "utf8"
  );
  const {
    autoUpdateProviderInstalls,
    isInstallOutdated,
    updateClaudeSdkInstalls,
  } = await import(
    pathToFileURL(path.join(buildDir, "core-claude-sdk-updates.js")).href
  );

  // A Claude SDK update covers the Harness copy and the global npm SDK, then
  // re-reads the catalog.
  const calls = [];
  const step =
    (name, fail = false) =>
    () => {
      calls.push(name);
      return fail
        ? Promise.reject(new Error(`${name} failed`))
        : Promise.resolve();
    };
  await updateClaudeSdkInstalls({
    refreshCatalog: step("refresh"),
    updateGlobal: step("global"),
    updateHarness: step("harness"),
  });
  assert.deepEqual(calls, ["harness", "global", "refresh"]);
  // One failing install does not skip the other or the refresh; the failure
  // is reported afterwards.
  calls.length = 0;
  await assert.rejects(
    updateClaudeSdkInstalls({
      refreshCatalog: step("refresh"),
      updateGlobal: step("global"),
      updateHarness: step("harness", true),
    }),
    /harness failed/u
  );
  assert.deepEqual(calls, ["harness", "global", "refresh"]);

  // Outdated: a published version differs from an existing install; missing
  // installs and unknown registry answers are left alone.
  const status = (
    installedVersions,
    latestVersion,
    provider = "claude",
    target = "sdk"
  ) => ({
    installedVersions,
    latestVersion,
    provider,
    target,
  });
  assert.equal(
    isInstallOutdated(status(["0.3.317", "0.3.316"], "0.3.317")),
    true
  );
  assert.equal(
    isInstallOutdated(status(["0.3.317", "0.3.317"], "0.3.317")),
    false
  );
  assert.equal(isInstallOutdated(status(["0.3.317", null], "0.3.317")), false);
  assert.equal(isInstallOutdated(status(["0.3.207"], null)), false);

  // Auto-update runs only enabled providers' outdated targets, in order, and
  // keeps going after a failed target.
  const updates = [];
  const updated = await autoUpdateProviderInstalls({
    enabled: new Set(["claude", "codex"]),
    statuses: [
      status(["2.1.316"], "2.1.317", "claude", "cli"),
      status(["0.3.317", "0.3.316"], "0.3.317", "claude", "sdk"),
      status(["0.166.0"], "0.167.0", "codex", "cli"),
      status(["0.9.0"], "0.9.0", "codex", "sdk"),
    ],
    update: (provider, target) => {
      updates.push(`${provider}:${target}`);
      return provider === "claude" && target === "cli"
        ? Promise.reject(new Error("claude update failed"))
        : Promise.resolve();
    },
  });
  assert.deepEqual(updates, ["claude:cli", "claude:sdk", "codex:cli"]);
  assert.deepEqual(updated, ["claude:sdk", "codex:cli"]);
  const codexOff = [];
  await autoUpdateProviderInstalls({
    enabled: new Set(["claude"]),
    statuses: [status(["0.166.0"], "0.167.0", "codex", "cli")],
    update: (provider, target) => {
      codexOff.push(`${provider}:${target}`);
      return Promise.resolve();
    },
  });
  assert.deepEqual(codexOff, []);

  // Wiring: buttons and toggles share one route; the Claude SDK target covers
  // both installs, the Codex CLI target re-reads the Codex catalog, and Core
  // starts the auto-updates after the catalog refreshes.
  assert.match(toolsSource, /export async function updateProviderTarget/u);
  assert.match(
    toolsSource,
    /updateGlobal: \(\) => installLatestGlobalPackage\(packageName\)/u
  );
  assert.match(toolsSource, /updateHarness: \(\) => updateClaudeSdk\(\)/u);
  assert.match(
    toolsSource,
    /provider === "codex"\) \{\s+await refreshCodexModelCatalog\(\{ force: true \}\);/u
  );
  assert.match(
    toolsSource,
    /installedVersions: \[readClaudeSdkVersion\(\), claudeSdkGlobal\]/u
  );
  assert.match(toolsSource, /readHarnessClaudeSdkPackageVersion\(\)/u);
  assert.match(
    apiSource,
    /refreshClaudeModelCatalog\(\)\.catch\(\(\) => undefined\);\n\s+startProviderAutoUpdates\(\);/u
  );
  assert.match(
    apiSource,
    /await updateProviderTarget\(request\?\.provider, request\?\.target\);/u
  );

  console.log("core provider install update tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
