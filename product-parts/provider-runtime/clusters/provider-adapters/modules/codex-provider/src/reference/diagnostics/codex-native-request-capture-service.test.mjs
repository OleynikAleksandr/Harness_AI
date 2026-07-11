import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const buildRoot = await mkdtemp(
  path.join(tmpdir(), "codex-native-capture-service-test-")
);
const diagnosticsDir = path.join(buildRoot, "reference", "diagnostics");
const appServerDir = path.join(buildRoot, "reference", "app-server");
const processDir = path.join(appServerDir, "process");
mkdirSync(diagnosticsDir, { recursive: true });
mkdirSync(processDir, { recursive: true });

const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

try {
  const source = readFileSync(
    new URL("./codex-native-request-capture-service.ts", import.meta.url),
    "utf8"
  );
  writeFileSync(
    path.join(diagnosticsDir, "codex-native-request-capture-service.js"),
    compile(source),
    "utf8"
  );
  writeFileSync(
    path.join(appServerDir, "codex-reasoning-summary-params.js"),
    'export const buildCodexReasoningSummaryParams = () => ({ summary: "detailed" });\n',
    "utf8"
  );
  writeFileSync(
    path.join(processDir, "codex-app-server-process.js"),
    "export class CodexAppServerProcess {}\n",
    "utf8"
  );
  writeFileSync(
    path.join(processDir, "codex-app-server-process-profile.js"),
    'export const CODEX_DEFAULT_PROCESS_PROFILE_KEY = "default";\n',
    "utf8"
  );
  writeFileSync(
    path.join(
      diagnosticsDir,
      "codex-native-request-capture-applied-envelope.js"
    ),
    [
      "export const buildCodexNativeRequestCaptureAppliedEnvelope = (input) => ({",
      '  kind: "codex",',
      "  reasoningEffort: input.turnStartParams.effort,",
      "});",
      "export const parseProviderHomeRolloutJsonl = () => [];",
      'export const resolveCodexNativeRequestCaptureTurnReasoningSummaryMode = () => "detailed";',
      "",
    ].join("\n"),
    "utf8"
  );

  const { CodexNativeRequestCaptureService } = await import(
    pathToFileURL(
      path.join(diagnosticsDir, "codex-native-request-capture-service.js")
    ).href
  );
  const requests = [];
  let notificationListener = () => undefined;
  const fakeProcess = {
    onNotification(listener) {
      notificationListener = listener;
      return () => undefined;
    },
    request(method, params) {
      requests.push({ method, params });
      if (method === "thread/start") {
        return Promise.resolve({ thread: { id: "thread-1", path: null } });
      }
      if (method === "turn/start") {
        queueMicrotask(() =>
          notificationListener({
            method: "turn/completed",
            params: { threadId: params.threadId },
          })
        );
        return Promise.resolve({ turn: { id: "turn-1" } });
      }
      return Promise.reject(new Error(`Unexpected method: ${method}`));
    },
    start: () => Promise.resolve(),
    stop: () => Promise.resolve(),
  };
  const diagnostics = [];
  let appliedEnvelope = null;
  const service = new CodexNativeRequestCaptureService({
    processFactory: () => fakeProcess,
    turnTimeoutMs: 1000,
    workspace: {
      defaultApprovalMode: "never",
      defaultModel: "gpt-5.6-sol",
      defaultReasoningEffort: "high",
      defaultSandboxMode: "danger-full-access",
      workspacePath: "/tmp/codex-capture",
    },
  });

  await service.captureNativeRequest({
    captureId: "capture-1",
    certificateEnv: {},
    certificatePath: "/tmp/capture-ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:12345",
    recordAppliedInputEnvelope: (envelope) => {
      appliedEnvelope = envelope;
    },
    recordDiagnosticContext: (record) => {
      diagnostics.push(record);
    },
    selectedModelId: "gpt-5.6-sol",
    selectedReasoningEffort: "ultra",
    workspacePath: "/tmp/codex-capture",
  });

  const turnStart = requests.find((request) => request.method === "turn/start");
  assert.equal(turnStart.params.model, "gpt-5.6-sol");
  assert.equal(turnStart.params.effort, "ultra");
  assert.equal(turnStart.params.summary, "detailed");
  assert.equal(appliedEnvelope.reasoningEffort, "ultra");
  assert.equal(
    diagnostics.find(
      (record) => record.kind === "codex_app_server_turn_start_request"
    ).payload.effort,
    "ultra"
  );

  console.log("codex native request capture service tests passed");
} finally {
  await rm(buildRoot, { force: true, recursive: true });
}
