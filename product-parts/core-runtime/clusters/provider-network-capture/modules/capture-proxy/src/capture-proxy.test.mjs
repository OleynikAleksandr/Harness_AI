import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import tls from "node:tls";
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

const TARGET_IGNORED_PATTERN = /502 Harness AI capture target ignored/u;
const CONNECTION_ESTABLISHED_PATTERN = /200 Connection Established/u;

function readOnce(socket) {
  return new Promise((resolve, reject) => {
    socket.once("data", (chunk) => resolve(chunk.toString("utf8")));
    socket.once("error", reject);
  });
}

const buildDir = await mkdtemp(path.join(tmpdir(), "capture-proxy-build-"));

try {
  // The facade imports its HTTP parser from a sibling module file, so compile
  // both into the build dir for the relative import to resolve.
  writeFileSync(
    path.join(buildDir, "capture-proxy-http.js"),
    compile("capture-proxy-http.ts"),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "capture-proxy-facade.js"),
    compile("capture-proxy-facade.ts"),
    "utf8"
  );
  const { NativeRequestCaptureProxy } = await import(
    pathToFileURL(path.join(buildDir, "capture-proxy-facade.js")).href
  );

  // Case 1: non-target CONNECT is ignored and never asks for TLS credentials.
  const ignoreEvents = [];
  const ignoreProxy = new NativeRequestCaptureProxy({
    providerId: "claude",
    targetRules: [{ host: "api.anthropic.com" }],
    timeoutMs: 40,
    onEvent: (event) => ignoreEvents.push(event),
    resolveTlsCredentials: () => {
      throw new Error("non-target must not request TLS credentials");
    },
  });
  const ignoreHandle = await ignoreProxy.start();
  const ignoreSocket = net.connect(ignoreHandle.port, "127.0.0.1");
  ignoreSocket.write(
    "CONNECT example.com:443 HTTP/1.1\r\nHost: example.com\r\n\r\n"
  );
  const ignoreResponse = await readOnce(ignoreSocket);
  const ignoreResult = await ignoreHandle.waitForCapture();
  await ignoreHandle.stop();
  ignoreSocket.destroy();

  assert.match(ignoreResponse, TARGET_IGNORED_PATTERN);
  assert.equal(ignoreResult.status, "timeout");
  assert.ok(ignoreEvents.some((e) => e.type === "proxy_connect"));
  const ignored = ignoreEvents.find((e) => e.type === "request_ignored");
  assert.equal(ignored.reason, "target_not_configured");
  assert.equal(ignored.target, "example.com:443");

  // Case 2: full capture-and-abort of a real HTTPS POST via TLS termination.
  const keyPath = path.join(buildDir, "host.key.pem");
  const certPath = path.join(buildDir, "host.cert.pem");
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-subj",
      "/CN=api.anthropic.com",
      "-addext",
      "subjectAltName=DNS:api.anthropic.com",
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
  const credentials = {
    cert: readFileSync(certPath),
    key: readFileSync(keyPath),
  };

  const proxy = new NativeRequestCaptureProxy({
    providerId: "claude",
    targetRules: [{ host: "api.anthropic.com", pathIncludes: "/v1/messages" }],
    timeoutMs: 5000,
    resolveTlsCredentials: () => credentials,
  });
  const handle = await proxy.start();

  const tunnel = net.connect(handle.port, "127.0.0.1");
  await new Promise((resolve, reject) => {
    tunnel.once("error", reject);
    tunnel.write(
      "CONNECT api.anthropic.com:443 HTTP/1.1\r\nHost: api.anthropic.com:443\r\n\r\n"
    );
    tunnel.once("data", (chunk) => {
      assert.match(chunk.toString("utf8"), CONNECTION_ESTABLISHED_PATTERN);
      resolve();
    });
  });

  const tlsSocket = tls.connect({
    socket: tunnel,
    servername: "api.anthropic.com",
    rejectUnauthorized: false,
  });
  await new Promise((resolve, reject) => {
    tlsSocket.once("secureConnect", resolve);
    tlsSocket.once("error", reject);
  });

  const requestBody = JSON.stringify({
    model: "claude-opus-4-8",
    system: "You are Claude.",
    tools: [{ name: "Read" }],
    messages: [{ role: "user", content: "hi" }],
  });
  tlsSocket.write(
    [
      "POST /v1/messages HTTP/1.1",
      "Host: api.anthropic.com",
      "Authorization: Bearer sk-secret",
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(requestBody)}`,
      "",
      requestBody,
    ].join("\r\n")
  );

  const result = await handle.waitForCapture();
  await handle.stop();
  tlsSocket.destroy();

  assert.equal(result.status, "captured");
  assert.equal(result.request.method, "POST");
  assert.equal(result.request.path, "/v1/messages");
  assert.equal(result.request.target, "api.anthropic.com:443");
  assert.equal(result.request.body.system, "You are Claude.");
  assert.equal(result.request.body.tools.length, 1);
  // The proxy hands the raw request to the writer; redaction happens there.
  assert.equal(result.request.headers.authorization, "Bearer sk-secret");

  // Case 3: bodyIncludes ignores a non-probe request (background prewarm on
  // the same endpoint) without ending the capture, then records the request
  // that carries the probe text.
  async function openTlsTunnel(proxyHandle) {
    const tunnelSocket = net.connect(proxyHandle.port, "127.0.0.1");
    await new Promise((resolve, reject) => {
      tunnelSocket.once("error", reject);
      tunnelSocket.write(
        "CONNECT api.anthropic.com:443 HTTP/1.1\r\nHost: api.anthropic.com:443\r\n\r\n"
      );
      tunnelSocket.once("data", (chunk) => {
        assert.match(chunk.toString("utf8"), CONNECTION_ESTABLISHED_PATTERN);
        resolve();
      });
    });
    const secureSocket = tls.connect({
      socket: tunnelSocket,
      servername: "api.anthropic.com",
      rejectUnauthorized: false,
    });
    await new Promise((resolve, reject) => {
      secureSocket.once("secureConnect", resolve);
      secureSocket.once("error", reject);
    });
    return secureSocket;
  }

  function writeJsonPost(socket, payload) {
    const body = JSON.stringify(payload);
    socket.write(
      [
        "POST /v1/messages HTTP/1.1",
        "Host: api.anthropic.com",
        "Content-Type: application/json",
        `Content-Length: ${Buffer.byteLength(body)}`,
        "",
        body,
      ].join("\r\n")
    );
  }

  const probeEvents = [];
  const probeProxy = new NativeRequestCaptureProxy({
    providerId: "codex",
    targetRules: [
      {
        host: "api.anthropic.com",
        pathIncludes: "/v1/messages",
        bodyIncludes: "Harness AI capture probe",
      },
    ],
    timeoutMs: 5000,
    onEvent: (event) => probeEvents.push(event),
    resolveTlsCredentials: () => credentials,
  });
  const probeHandle = await probeProxy.start();

  const prewarmSocket = await openTlsTunnel(probeHandle);
  writeJsonPost(prewarmSocket, {
    model: "gpt-5.5",
    input: [{ type: "text", text: "background prewarm turn" }],
  });
  await new Promise((resolve) => prewarmSocket.once("close", resolve));

  const probeSocket = await openTlsTunnel(probeHandle);
  writeJsonPost(probeSocket, {
    model: "gpt-5.5",
    instructions: "You are Codex.",
    tools: [{ name: "shell" }],
    input: [{ type: "text", text: "Harness AI capture probe turn" }],
  });
  const probeResult = await probeHandle.waitForCapture();
  await probeHandle.stop();
  prewarmSocket.destroy();
  probeSocket.destroy();

  assert.equal(probeResult.status, "captured");
  assert.equal(probeResult.request.body.instructions, "You are Codex.");
  const bodyIgnored = probeEvents.find(
    (event) =>
      event.type === "request_ignored" &&
      event.reason === "request_body_not_matched"
  );
  assert.ok(bodyIgnored, "expected the prewarm request to be ignored");
  // The ignored matched-path request carries structural diagnostics (no
  // header/body values) so the artifact shows why it was rejected.
  assert.ok(bodyIgnored.detail, "expected diagnostic detail on the ignore");
  assert.equal(bodyIgnored.detail.probeMatched, false);
  assert.equal(bodyIgnored.detail.hasContentLength, true);
  assert.ok(bodyIgnored.detail.bodyBytes > 0);
  assert.deepEqual(bodyIgnored.detail.topLevelKeys, ["model", "input"]);

  // Case 4: a chunked probe POST (Transfer-Encoding: chunked, no
  // Content-Length, arriving in two writes) is reassembled and captured. This
  // is the Codex responses transport that a Content-Length-only reader missed.
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const toChunk = (text) =>
    `${Buffer.byteLength(text).toString(16)}\r\n${text}\r\n`;

  const chunkedProxy = new NativeRequestCaptureProxy({
    providerId: "codex",
    targetRules: [
      {
        host: "api.anthropic.com",
        pathIncludes: "/v1/messages",
        bodyIncludes: "Harness AI capture probe",
      },
    ],
    timeoutMs: 5000,
    resolveTlsCredentials: () => credentials,
  });
  const chunkedHandle = await chunkedProxy.start();
  const chunkedSocket = await openTlsTunnel(chunkedHandle);

  const chunkedBody = JSON.stringify({
    model: "gpt-5.5",
    instructions: "You are Codex.",
    tools: [{ name: "shell" }],
    input: [{ type: "text", text: "Harness AI capture probe turn" }],
  });
  const splitAt = Math.floor(chunkedBody.length / 2);
  const chunkedHead = [
    "POST /v1/messages HTTP/1.1",
    "Host: api.anthropic.com",
    "Transfer-Encoding: chunked",
    "Content-Type: application/json",
    "",
    "",
  ].join("\r\n");
  chunkedSocket.write(chunkedHead + toChunk(chunkedBody.slice(0, splitAt)));
  await delay(20);
  chunkedSocket.write(`${toChunk(chunkedBody.slice(splitAt))}0\r\n\r\n`);

  const chunkedResult = await chunkedHandle.waitForCapture();
  await chunkedHandle.stop();
  chunkedSocket.destroy();

  assert.equal(chunkedResult.status, "captured");
  assert.equal(chunkedResult.request.body.instructions, "You are Codex.");
  assert.equal(chunkedResult.request.body.tools.length, 1);

  console.log("capture-proxy tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
