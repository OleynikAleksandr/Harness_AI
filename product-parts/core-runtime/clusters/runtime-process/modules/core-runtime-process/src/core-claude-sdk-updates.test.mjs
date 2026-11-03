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
  const { autoUpdateClaudeSdk, updateClaudeSdkAndCatalog } = await import(
    pathToFileURL(path.join(buildDir, "core-claude-sdk-updates.js")).href
  );

  const recorder = (current, latest) => {
    const calls = [];
    return {
      calls,
      readCurrent: () => current,
      readLatest: () => Promise.resolve(latest),
      refreshCatalog: () => {
        calls.push("refresh");
        return Promise.resolve();
      },
      update: () => {
        calls.push("update");
        return Promise.resolve();
      },
    };
  };

  // Manual update re-reads the catalog after installing.
  const manual = recorder(null, null);
  await updateClaudeSdkAndCatalog(manual);
  assert.deepEqual(manual.calls, ["update", "refresh"]);

  // Auto-update: off, already current, or no registry answer → nothing runs.
  const off = recorder("0.3.207", "0.3.317");
  assert.equal(await autoUpdateClaudeSdk({ ...off, enabled: false }), false);
  assert.deepEqual(off.calls, []);
  const current = recorder("0.3.317", "0.3.317");
  assert.equal(await autoUpdateClaudeSdk({ ...current, enabled: true }), false);
  assert.deepEqual(current.calls, []);
  const offline = recorder("0.3.207", null);
  assert.equal(await autoUpdateClaudeSdk({ ...offline, enabled: true }), false);
  assert.deepEqual(offline.calls, []);

  // A newer published SDK (or a missing install) updates, then refreshes.
  const stale = recorder("0.3.207", "0.3.317");
  assert.equal(await autoUpdateClaudeSdk({ ...stale, enabled: true }), true);
  assert.deepEqual(stale.calls, ["update", "refresh"]);
  const missing = recorder(null, "0.3.317");
  assert.equal(await autoUpdateClaudeSdk({ ...missing, enabled: true }), true);

  // A failed install propagates and skips the refresh.
  const failing = {
    ...recorder("0.3.207", "0.3.317"),
    update: () => Promise.reject(new Error("npm failed")),
  };
  await assert.rejects(
    autoUpdateClaudeSdk({ ...failing, enabled: true }),
    /npm failed/u
  );
  assert.deepEqual(failing.calls, []);

  // Wiring: the Claude SDK row and update target the Harness SDK, and Core
  // starts the auto-update after the catalog refreshes.
  assert.match(toolsSource, /readHarnessClaudeSdkPackageVersion\(\)/u);
  assert.doesNotMatch(
    toolsSource,
    /readPackageVersion\(PROVIDER_PACKAGE_MAP\.claude\.sdk\)/u
  );
  assert.match(
    toolsSource,
    /refreshCatalog: \(\) => refreshClaudeModelCatalog\(\{ force: true \}\)/u
  );
  assert.match(toolsSource, /providers\.claude\.autoUpdate\s*\.enabled/u);
  assert.match(
    apiSource,
    /refreshClaudeModelCatalog\(\)\.catch\(\(\) => undefined\);\n\s+startClaudeSdkAutoUpdate\(\);/u
  );
  assert.match(
    apiSource,
    /await updateProviderSdk\(request\?\.provider, request\?\.target\);/u
  );

  console.log("core claude sdk update tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
