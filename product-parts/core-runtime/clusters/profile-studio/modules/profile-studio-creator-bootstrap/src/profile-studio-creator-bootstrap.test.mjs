import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

const { ProfileStudioCreatorBootstrapFacade, mapTargetToCaptureProvider } =
  await import(
    `data:text/javascript;base64,${Buffer.from(
      compile("profile-studio-creator-bootstrap-facade.ts")
    ).toString("base64")}`
  );

const previousHarnessHome = process.env.HARNESS_AI_HOME;
const harnessHome = mkdtempSync(path.join(tmpdir(), "harness-bootstrap-"));
const captureRoot = path.join(harnessHome, "logs", "native-request-capture");
process.env.HARNESS_AI_HOME = harnessHome;
mkdirSync(captureRoot, { recursive: true });

function createCapture({ modelId = "opus", providerId = "claude" } = {}) {
  const stem = path.join(
    captureRoot,
    `2026-07-21T00-00-00-000Z-${providerId}-${modelId}-high-native-request`
  );
  const jsonlPath = `${stem}.jsonl`;
  const captureId = "capture-1";
  writeFileSync(
    jsonlPath,
    `${JSON.stringify({
      captureId,
      providerId,
      request: { body: { changingProviderShape: true } },
      type: "request_captured",
    })}\n`
  );
  writeFileSync(
    `${stem}.diagnostics.jsonl`,
    [
      {
        captureId,
        providerId,
        selectedModelId: modelId,
        selectedReasoningEffort: "high",
        type: "capture_start",
      },
      {
        captureId,
        providerId,
        status: "captured",
        type: "capture_end",
      },
    ]
      .map((record) => JSON.stringify(record))
      .join("\n")
  );
  return jsonlPath;
}

try {
  let receivedRequest;
  const rawPath = createCapture();
  const facade = new ProfileStudioCreatorBootstrapFacade({
    captureRunner: {
      capture(request) {
        receivedRequest = request;
        return Promise.resolve({ error: null, jsonlPath: rawPath, ok: true });
      },
    },
  });
  const result = await facade.prepare({
    modelId: "opus",
    providerId: "claude",
    reasoningEffort: "high",
    workspacePath: "/workspace",
  });
  assert.equal(result.ok, true);
  assert.equal(result.provenance.captureId, "capture-1");
  assert.equal(result.provenance.targetProviderId, "claude");
  assert.equal(result.provenance.targetModelId, "opus");
  assert.equal(result.provenance.targetReasoning, "high");
  assert.equal(result.provenance.rawCapturePath, realpathSync(rawPath));
  assert.match(result.provenance.rawCaptureSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(receivedRequest, {
    modelId: "opus",
    providerId: "claude",
    reasoningEffort: "high",
    workspacePath: "/workspace",
  });

  assert.equal(mapTargetToCaptureProvider("kimi-client"), "kimi");
  assert.equal(mapTargetToCaptureProvider("codex"), "codex");

  const mismatchPath = createCapture({ modelId: "sonnet" });
  const mismatch = await new ProfileStudioCreatorBootstrapFacade({
    captureRunner: {
      capture() {
        return Promise.resolve({
          error: null,
          jsonlPath: mismatchPath,
          ok: true,
        });
      },
    },
  }).prepare({
    modelId: "opus",
    providerId: "claude",
    workspacePath: "/workspace",
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /target identity does not match/u);

  const failed = await new ProfileStudioCreatorBootstrapFacade({
    captureRunner: {
      capture() {
        return Promise.resolve({
          error: "timeout",
          jsonlPath: null,
          ok: false,
        });
      },
    },
  }).prepare({
    modelId: "gpt-5.6-sol",
    providerId: "codex",
    workspacePath: "/workspace",
  });
  assert.deepEqual(failed, {
    error: "Native Request Capture failed: timeout",
    ok: false,
  });

  console.log("profile-studio-creator-bootstrap tests: OK");
} finally {
  rmSync(harnessHome, { force: true, recursive: true });
  if (previousHarnessHome === undefined) {
    process.env.HARNESS_AI_HOME = undefined;
  } else {
    process.env.HARNESS_AI_HOME = previousHarnessHome;
  }
}
