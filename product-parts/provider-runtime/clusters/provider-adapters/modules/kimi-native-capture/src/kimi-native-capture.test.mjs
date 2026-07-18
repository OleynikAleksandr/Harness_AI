import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function compile(file) {
  return ts.transpileModule(
    readFileSync(new URL(`./${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
}

const buildDir = await mkdtemp(path.join(tmpdir(), "kimi-capture-build-"));
const sourceConfigDir = await mkdtemp(
  path.join(tmpdir(), "kimi-capture-home-")
);
try {
  const contractDir = path.join(buildDir, "provider-adapter-contract", "src");
  const moduleDir = path.join(buildDir, "kimi-native-capture", "src");
  mkdirSync(contractDir, { recursive: true });
  mkdirSync(moduleDir, { recursive: true });
  writeFileSync(
    path.join(contractDir, "provider-adapter-contract-facade.js"),
    "export {};\n",
    "utf8"
  );
  for (const file of [
    "kimi-capture-config-rewrite",
    "kimi-acp-client",
    "kimi-native-capture-facade",
  ]) {
    writeFileSync(
      path.join(moduleDir, `${file}.js`),
      compile(`${file}.ts`),
      "utf8"
    );
  }
  const { prepareKimiCaptureConfig } = await import(
    pathToFileURL(path.join(moduleDir, "kimi-capture-config-rewrite.js")).href
  );
  const { KimiNativeCaptureFacade, readKimiCliVersionStatus, upgradeKimiCli } =
    await import(
      pathToFileURL(path.join(moduleDir, "kimi-native-capture-facade.js")).href
    );

  const sourceConfig = `default_model = "kimi-for-coding"
[services.moonshot_search]
base_url = "https://api.kimi.com/search"
[providers.kimi-for-coding]
type = "kimi"
base_url = "https://api.kimi.com/coding/v1"
[models.kimi-for-coding]
provider = "kimi-for-coding"
model = "kimi-for-coding"
max_context_size = 262144
`;
  const rewritten = prepareKimiCaptureConfig(
    sourceConfig,
    "http://127.0.0.1:54321",
    "k3"
  );
  assert.match(rewritten, /default_model = "k3"/u);
  assert.match(
    rewritten,
    /base_url = "http:\/\/127\.0\.0\.1:54321\/coding\/v1"/u
  );
  assert.match(rewritten, /\[models\.k3\][\s\S]*model = "k3"/u);
  assert.match(rewritten, /https:\/\/api\.kimi\.com\/search/u);
  assert.throws(
    () => prepareKimiCaptureConfig(sourceConfig, "http://localhost", "bad id"),
    /not safe/u
  );

  await writeFile(
    path.join(sourceConfigDir, "config.toml"),
    sourceConfig,
    "utf8"
  );
  await writeFile(path.join(sourceConfigDir, "device_id"), "device", "utf8");
  const calls = [];
  let capturedTempHome = null;
  const facade = new KimiNativeCaptureFacade({
    baseEnv: { PATH: process.env.PATH },
    kimiCommand: process.execPath,
    sourceConfigDir,
    clientFactory: ({ env }) => {
      capturedTempHome = env.HOME;
      return {
        initialize: async () => calls.push("initialize"),
        prompt: async (_sessionId, prompt) => calls.push(`prompt:${prompt}`),
        setModel: async (_sessionId, model) => calls.push(`model:${model}`),
        start: async () => calls.push("start"),
        startSession: () => {
          calls.push("session");
          return Promise.resolve("session-1");
        },
        stop: async () => calls.push("stop"),
      };
    },
  });
  const diagnostics = [];
  const envelopes = [];
  await facade.captureNativeRequest({
    captureId: "cap-k3",
    certificateEnv: {},
    certificatePath: "",
    probePrompt: "Harness AI native request capture probe",
    proxyUrl: "http://127.0.0.1:54321",
    recordAppliedInputEnvelope: (envelope) => envelopes.push(envelope),
    recordDiagnosticContext: (record) => diagnostics.push(record),
    selectedModelId: "k3",
    workspacePath: process.cwd(),
  });
  assert.deepEqual(calls, [
    "start",
    "initialize",
    "session",
    "model:k3",
    "prompt:Harness AI native request capture probe",
    "stop",
  ]);
  assert.equal(envelopes[0].kind, "kimi");
  assert.equal(envelopes[0].mode, "acp_default_agent");
  assert.equal(diagnostics[0].payload.selectedModelId, "k3");
  await assert.rejects(() => stat(capturedTempHome), /ENOENT/u);

  const updatesDir = path.join(sourceConfigDir, "updates");
  mkdirSync(updatesDir, { recursive: true });
  await writeFile(
    path.join(updatesDir, "latest.json"),
    JSON.stringify({ latest: "0.99.1", source: "cdn" }),
    "utf8"
  );
  const kimiArgsLog = path.join(sourceConfigDir, "kimi-args.log");
  const fakeKimi = path.join(sourceConfigDir, "fake-kimi.sh");
  await writeFile(
    fakeKimi,
    `#!/bin/sh\necho "$@" >> "${kimiArgsLog}"\necho "0.98.0"\n`,
    { mode: 0o755 }
  );
  // The live CDN channel wins over the passive state file (manifest shape
  // replayed from the 2026-07-18 probe: 302 redirect, then JSON).
  const channelStatus = await readKimiCliVersionStatus({
    fetchImpl: () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            publishedAt: "2026-07-17T13:17:41Z",
            rollout: [{ delaySeconds: 0, percent: 100 }],
            schemaVersion: 1,
            version: "0.27.0",
          }),
        ok: true,
      }),
    kimiCommand: fakeKimi,
    updateStatePath: path.join(updatesDir, "latest.json"),
  });
  assert.deepEqual(channelStatus, {
    currentVersion: "0.98.0",
    latestVersion: "0.27.0",
  });
  // An unreachable channel falls back to the state file; a manifest without
  // a release version string does too.
  const versionStatus = await readKimiCliVersionStatus({
    fetchImpl: () => Promise.reject(new Error("offline")),
    kimiCommand: fakeKimi,
    updateStatePath: path.join(updatesDir, "latest.json"),
  });
  assert.deepEqual(versionStatus, {
    currentVersion: "0.98.0",
    latestVersion: "0.99.1",
  });
  const junkManifestStatus = await readKimiCliVersionStatus({
    fetchImpl: () =>
      Promise.resolve({
        json: () => Promise.resolve({ version: "not-a-version" }),
        ok: true,
      }),
    kimiCommand: fakeKimi,
    updateStatePath: path.join(updatesDir, "latest.json"),
  });
  assert.equal(junkManifestStatus.latestVersion, "0.99.1");
  const missingStatus = await readKimiCliVersionStatus({
    fetchImpl: () => Promise.reject(new Error("offline")),
    kimiCommand: path.join(sourceConfigDir, "missing-kimi"),
    updateStatePath: path.join(updatesDir, "absent.json"),
  });
  assert.deepEqual(missingStatus, {
    currentVersion: null,
    latestVersion: null,
  });
  assert.deepEqual(readFileSync(kimiArgsLog, "utf8").trim().split("\n"), [
    "--version",
    "--version",
    "--version",
  ]);

  // Upgrade flows run against a version-file-backed fake CLI: `--version`
  // reads the file, `upgrade` bumps it only when the self-update flag file
  // exists (package-manager installs); a native install leaves it untouched
  // exactly like the real CLI ("Auto-update is not supported", exit 0).
  const upgradeVersionFile = path.join(sourceConfigDir, "fake-version.txt");
  const selfUpdateFlag = path.join(sourceConfigDir, "self-update-enabled");
  const fakeUpgradeKimi = path.join(sourceConfigDir, "fake-upgrade-kimi.sh");
  await writeFile(
    fakeUpgradeKimi,
    [
      "#!/bin/sh",
      `if [ "$1" = "--version" ]; then cat "${upgradeVersionFile}"; exit 0; fi`,
      `if [ "$1" = "upgrade" ]; then`,
      `  if [ -f "${selfUpdateFlag}" ]; then printf "0.99.9" > "${upgradeVersionFile}"; fi`,
      "  exit 0",
      "fi",
    ].join("\n"),
    { mode: 0o755 }
  );
  const throwingInstaller = () =>
    Promise.reject(new Error("installer must not run"));

  // 1. A package-manager install self-updates: no installer involved.
  await writeFile(upgradeVersionFile, "0.98.0", "utf8");
  await writeFile(selfUpdateFlag, "", "utf8");
  await upgradeKimiCli(fakeUpgradeKimi, {
    runNativeInstaller: throwingInstaller,
  });
  assert.equal(readFileSync(upgradeVersionFile, "utf8"), "0.99.9");

  // 2. A native install refuses self-update: the vendor installer runs and
  // the version must move.
  await rm(selfUpdateFlag, { force: true });
  await writeFile(upgradeVersionFile, "0.98.0", "utf8");
  let installerRuns = 0;
  await upgradeKimiCli(fakeUpgradeKimi, {
    fetchImpl: () =>
      Promise.resolve({
        json: () => Promise.resolve({ version: "0.99.2" }),
        ok: true,
      }),
    runNativeInstaller: () => {
      installerRuns += 1;
      writeFileSync(upgradeVersionFile, "0.99.2", "utf8");
      return Promise.resolve();
    },
  });
  assert.equal(installerRuns, 1);
  assert.equal(readFileSync(upgradeVersionFile, "utf8"), "0.99.2");

  // 3. Already current (channel equals the installed version) and offline
  // checks stay clean no-ops without touching the installer.
  await upgradeKimiCli(fakeUpgradeKimi, {
    fetchImpl: () =>
      Promise.resolve({
        json: () => Promise.resolve({ version: "0.99.2" }),
        ok: true,
      }),
    runNativeInstaller: throwingInstaller,
  });
  await upgradeKimiCli(fakeUpgradeKimi, {
    fetchImpl: () => Promise.reject(new Error("offline")),
    runNativeInstaller: throwingInstaller,
  });

  // 4. An installer run that changes nothing rejects honestly so the card
  // shows the failure instead of a silent no-op.
  await writeFile(upgradeVersionFile, "0.98.0", "utf8");
  await assert.rejects(
    () =>
      upgradeKimiCli(fakeUpgradeKimi, {
        fetchImpl: () =>
          Promise.resolve({
            json: () => Promise.resolve({ version: "0.99.2" }),
            ok: true,
          }),
        runNativeInstaller: () => Promise.resolve(),
      }),
    /did not change the installed version/u
  );

  console.log("kimi native capture tests passed");
} finally {
  await rm(buildDir, { force: true, recursive: true });
  await rm(sourceConfigDir, { force: true, recursive: true });
}
