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

const CONNECTION_ESTABLISHED_PATTERN = /200 Connection Established/u;
const UPSTREAM_RESPONSE = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok";

// A fake upstream: records what the proxy forwarded and replies once the
// request head arrives, so we can assert both forwarding and response relay.
function startFakeUpstream() {
  const connections = [];
  const server = net.createServer((socket) => {
    const chunks = [];
    connections.push({ socket, chunks });
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).includes("\r\n\r\n")) {
        socket.write(UPSTREAM_RESPONSE);
      }
    });
    socket.on("error", () => socket.destroy());
  });
  return { server, connections };
}

const buildDir = await mkdtemp(path.join(tmpdir(), "capture-proxy-build-"));

try {
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

  const fake = startFakeUpstream();
  await new Promise((resolve) => fake.server.listen(0, "127.0.0.1", resolve));
  const fakePort = fake.server.address().port;

  function buildProxy(rule, events) {
    return new NativeRequestCaptureProxy({
      providerId: "claude",
      targetRules: [rule],
      timeoutMs: 4000,
      onEvent: events ? (e) => events.push(e) : undefined,
      resolveTlsCredentials: () => credentials,
      // Forward to the local fake upstream instead of the real host.
      createUpstream: () => net.connect(fakePort, "127.0.0.1"),
    });
  }

  async function openClientTls(handle) {
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
    return tlsSocket;
  }

  function writeJsonPost(socket, payload) {
    const body = JSON.stringify(payload);
    socket.write(
      [
        "POST /v1/messages HTTP/1.1",
        "Host: api.anthropic.com",
        "Authorization: Bearer sk-secret",
        "Content-Type: application/json",
        `Content-Length: ${Buffer.byteLength(body)}`,
        "",
        body,
      ].join("\r\n")
    );
  }

  const rule = {
    host: "api.anthropic.com",
    pathIncludes: "/v1/messages",
    bodyIncludes: "Harness AI capture probe",
  };

  // Case 1: a matched request is captured AND forwarded; the client gets the
  // real upstream response relayed back.
  const proxy = buildProxy(rule);
  const handle = await proxy.start();
  const client = await openClientTls(handle);
  const clientResponse = new Promise((resolve) => {
    client.once("data", (chunk) => resolve(chunk.toString("utf8")));
  });
  writeJsonPost(client, {
    model: "claude-opus-4-8",
    system: "You are Claude.",
    tools: [{ name: "Read" }],
    input: "Harness AI capture probe turn",
  });
  const result = await handle.waitForCapture();
  const relayed = await clientResponse;
  await handle.stop();
  client.destroy();

  assert.equal(result.status, "captured");
  assert.equal(result.request.method, "POST");
  assert.equal(result.request.body.system, "You are Claude.");
  assert.match(
    relayed,
    /200 OK/u,
    "client should receive the relayed response"
  );
  assert.ok(
    fake.connections.some((c) =>
      Buffer.concat(c.chunks).includes("You are Claude.")
    ),
    "upstream should have received the forwarded request"
  );

  // Case 2: a non-probe request on the target endpoint is forwarded but NOT
  // captured (it is emitted as ignored and the capture keeps waiting).
  const events2 = [];
  const proxy2 = buildProxy(rule, events2);
  const handle2 = await proxy2.start();
  const client2 = await openClientTls(handle2);
  writeJsonPost(client2, {
    model: "claude-opus-4-8",
    input: "background turn",
  });
  const result2 = await handle2.waitForCapture();
  await handle2.stop();
  client2.destroy();

  assert.equal(result2.status, "timeout", "non-probe must not be captured");
  assert.ok(
    events2.some(
      (e) => e.type === "request_ignored" && e.detail?.probeMatched === false
    ),
    "the non-probe request should be reported ignored with detail"
  );

  for (const connection of fake.connections) {
    connection.socket.destroy();
  }
  await new Promise((resolve) => fake.server.close(resolve));

  console.log("capture-proxy tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
