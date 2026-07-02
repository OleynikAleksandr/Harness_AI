import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Mirror the four cluster facades into one build dir so the orchestrator's
// relative imports (../../capture-artifacts/...) resolve after transpile.
const FACADES = [
  ["capture-artifacts", "capture-artifacts-facade"],
  ["capture-certificates", "capture-certificates-facade"],
  ["capture-proxy", "capture-proxy-facade"],
  ["capture-orchestrator", "capture-orchestrator-facade"],
];

function compile(sourceUrl) {
  return ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const buildRoot = await mkdtemp(path.join(tmpdir(), "capture-orch-build-"));
const outputDir = await mkdtemp(path.join(tmpdir(), "capture-orch-out-"));

try {
  for (const [moduleId, facade] of FACADES) {
    const srcUrl = new URL(
      `../../${moduleId}/src/${facade}.ts`,
      import.meta.url
    );
    const destDir = path.join(buildRoot, moduleId, "src");
    mkdirSync(destDir, { recursive: true });
    writeFileSync(path.join(destDir, `${facade}.js`), compile(srcUrl), "utf8");
  }
  const { NativeCaptureOrchestrator, DEFAULT_CAPTURE_TARGET_RULES } =
    await import(
      pathToFileURL(
        path.join(
          buildRoot,
          "capture-orchestrator/src/capture-orchestrator-facade.js"
        )
      ).href
    );

  // Default target rules cover the three capture providers.
  assert.equal(
    DEFAULT_CAPTURE_TARGET_RULES.claude[0].host,
    "api.anthropic.com"
  );
  assert.equal(DEFAULT_CAPTURE_TARGET_RULES.codex[0].host, "chatgpt.com");
  assert.equal(DEFAULT_CAPTURE_TARGET_RULES.kimi[0].host, "api.moonshot.ai");

  const fakeCertStore = {
    prepareHostCredentials: () =>
      Promise.resolve({
        credentials: {
          ca: Buffer.from("CA"),
          cert: Buffer.from("CERT"),
          key: Buffer.from("KEY"),
        },
        envHints: { NODE_EXTRA_CA_CERTS: "/tmp/ca.pem" },
      }),
  };

  const clock = () => new Date("2026-07-02T18:00:00.000Z");

  // Success path: the proxy captures a request; the provider run then resolves.
  const capturedRequest = {
    body: {
      system: "You are Claude.",
      tools: [{ name: "Read" }],
      messages: [],
    },
    bodyText: '{"system":"You are Claude."}',
    headers: { authorization: "Bearer sk-secret" },
    method: "POST",
    path: "/v1/messages",
    target: "api.anthropic.com:443",
    timestamp: "2026-07-02T18:00:00.000Z",
  };
  const okProxyFactory = () => ({
    start: () =>
      Promise.resolve({
        port: 12_345,
        proxyUrl: "http://127.0.0.1:12345",
        stop: () => Promise.resolve(),
        waitForCapture: () =>
          Promise.resolve({ status: "captured", request: capturedRequest }),
      }),
  });
  let capturedContext = null;
  const orchestrator = new NativeCaptureOrchestrator({
    captureIdFactory: () => "cap-1",
    certificateStore: fakeCertStore,
    clock,
    proxyFactory: okProxyFactory,
  });
  const okResult = await orchestrator.capture({
    providerId: "claude",
    model: "claude-opus-4-8",
    outputDir,
    runProviderCapture: (context) => {
      capturedContext = context;
      return Promise.resolve();
    },
  });
  assert.equal(okResult.ok, true);
  assert.equal(okResult.reason, null);
  assert.equal(capturedContext.proxyUrl, "http://127.0.0.1:12345");
  assert.equal(
    capturedContext.certificateEnv.NODE_EXTRA_CA_CERTS,
    "/tmp/ca.pem"
  );
  assert.match(capturedContext.probePrompt, /must not be sent upstream/u);
  const markdown = await readFile(okResult.markdownPath, "utf8");
  assert.ok(!markdown.includes("sk-secret"));
  assert.match(markdown, /You are Claude\./u);

  // Timeout path: the proxy times out and the provider run also fails.
  const timeoutProxyFactory = () => ({
    start: () =>
      Promise.resolve({
        port: 1,
        proxyUrl: "http://127.0.0.1:1",
        stop: () => Promise.resolve(),
        waitForCapture: () =>
          Promise.resolve({ status: "timeout", reason: "timeout" }),
      }),
  });
  const timeoutResult = await new NativeCaptureOrchestrator({
    captureIdFactory: () => "cap-2",
    certificateStore: fakeCertStore,
    clock,
    proxyFactory: timeoutProxyFactory,
  }).capture({
    providerId: "codex",
    outputDir,
    runProviderCapture: () => Promise.reject(new Error("codex client aborted")),
  });
  assert.equal(timeoutResult.ok, false);
  assert.equal(timeoutResult.reason, "timeout");

  // Missing target rule: fails fast with target_not_seen, still writes artifacts.
  const noTargetResult = await new NativeCaptureOrchestrator({
    captureIdFactory: () => "cap-3",
    certificateStore: fakeCertStore,
    clock,
    proxyFactory: okProxyFactory,
  }).capture({
    providerId: "kimi",
    outputDir,
    targetRules: [],
    runProviderCapture: () => Promise.resolve(),
  });
  assert.equal(noTargetResult.ok, false);
  assert.equal(noTargetResult.reason, "target_not_seen");
  assert.ok(noTargetResult.jsonlPath);

  console.log("capture-orchestrator tests: OK");
} finally {
  await rm(buildRoot, { force: true, recursive: true });
  await rm(outputDir, { force: true, recursive: true });
}
