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
  ["capture-proxy", "capture-proxy-http"],
  ["capture-proxy", "capture-proxy-ws"],
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

  // The Codex rule is host+path only: the WebSocket upgrade on that path is
  // routed to the WS capture, so no HTTP-body matcher (bodyIncludes) applies.
  assert.equal(
    DEFAULT_CAPTURE_TARGET_RULES.codex[0].pathIncludes,
    "/backend-api/codex/responses"
  );
  assert.equal(DEFAULT_CAPTURE_TARGET_RULES.codex[0].bodyIncludes, undefined);

  const fakeCertStore = {
    prepareHostCredentials: () =>
      Promise.resolve({
        caCertPath: "/tmp/ca.pem",
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
  assert.equal(capturedContext.certificatePath, "/tmp/ca.pem");
  assert.equal(capturedContext.selectedModelId, "claude-opus-4-8");
  assert.equal(capturedContext.captureId, "cap-1");
  assert.equal(
    capturedContext.certificateEnv.NODE_EXTRA_CA_CERTS,
    "/tmp/ca.pem"
  );
  assert.match(capturedContext.probePrompt, /must not be sent upstream/u);
  assert.equal(typeof capturedContext.recordAppliedInputEnvelope, "function");
  const markdown = await readFile(okResult.markdownPath, "utf8");
  assert.ok(!markdown.includes("sk-secret"));
  assert.match(markdown, /You are Claude\./u);

  // Proxy events are forwarded into the artifact diagnostic context so an
  // ignored prewarm request is visible in the dump.
  const eventProxyFactory = (proxyOptions) => ({
    start: () =>
      Promise.resolve({
        port: 999,
        proxyUrl: "http://127.0.0.1:999",
        stop: () => Promise.resolve(),
        waitForCapture: () => {
          proxyOptions.onEvent?.({
            type: "proxy_connect",
            target: "chatgpt.com:443",
          });
          proxyOptions.onEvent?.({
            type: "request_ignored",
            target: "chatgpt.com:443",
            reason: "request_body_not_matched",
          });
          return Promise.resolve({
            status: "captured",
            request: capturedRequest,
          });
        },
      }),
  });
  const eventResult = await new NativeCaptureOrchestrator({
    captureIdFactory: () => "cap-evt",
    certificateStore: fakeCertStore,
    clock,
    proxyFactory: eventProxyFactory,
  }).capture({
    providerId: "codex",
    model: "gpt-5.5",
    outputDir,
    runProviderCapture: () => Promise.resolve(),
  });
  assert.equal(eventResult.ok, true);
  const eventMarkdown = await readFile(eventResult.markdownPath, "utf8");
  assert.match(eventMarkdown, /capture_proxy_event/u);
  assert.match(eventMarkdown, /request_body_not_matched/u);

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

  // Missing target rule (proxy provider): fails fast with target_not_seen.
  const noTargetResult = await new NativeCaptureOrchestrator({
    captureIdFactory: () => "cap-3",
    certificateStore: fakeCertStore,
    clock,
    proxyFactory: okProxyFactory,
  }).capture({
    providerId: "codex",
    outputDir,
    targetRules: [],
    runProviderCapture: () => Promise.resolve(),
  });
  assert.equal(noTargetResult.ok, false);
  assert.equal(noTargetResult.reason, "target_not_seen");
  assert.ok(noTargetResult.jsonlPath);

  // Kimi wire-only: no proxy, no certificate store; the adapter records the
  // envelope and the capture succeeds.
  let wireContext = null;
  let certStoreCalls = 0;
  const wireResult = await new NativeCaptureOrchestrator({
    captureIdFactory: () => "cap-kimi",
    certificateStore: {
      prepareHostCredentials: () => {
        certStoreCalls += 1;
        return Promise.resolve({
          caCertPath: "/tmp/ca.pem",
          credentials: {},
          envHints: {},
        });
      },
    },
    clock,
    proxyFactory: () => {
      throw new Error("Kimi wire-only must not start a proxy");
    },
  }).capture({
    providerId: "kimi",
    model: "kimi-k2.7-code",
    outputDir,
    runProviderCapture: (context) => {
      wireContext = context;
      return context.recordAppliedInputEnvelope({
        kind: "kimi",
        wireJsonlPath: "/home/kimi/wire.jsonl",
      });
    },
  });
  assert.equal(wireResult.ok, true);
  assert.equal(certStoreCalls, 0);
  assert.equal(wireContext.proxyUrl, "wire://kimi");
  assert.equal(wireContext.certificatePath, "");
  const wireMarkdown = await readFile(wireResult.markdownPath, "utf8");
  assert.match(wireMarkdown, /wire\.jsonl/u);
  assert.match(wireMarkdown, /No HTTP request intercepted/u);

  console.log("capture-orchestrator tests: OK");
} finally {
  await rm(buildRoot, { force: true, recursive: true });
  await rm(outputDir, { force: true, recursive: true });
}
