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
const UPGRADE_WEBSOCKET_PATTERN = /upgrade:\s*websocket/iu;
const UPSTREAM_RESPONSE = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok";
const UPSTREAM_WS_ACCEPT =
  "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n";

// A fake upstream: records what the proxy forwarded and replies once the
// request head arrives — 101 for a WebSocket upgrade, else 200 — so we can
// assert forwarding, response relay, and the deflate-strip rewrite.
function startFakeUpstream() {
  const connections = [];
  const server = net.createServer((socket) => {
    const chunks = [];
    const connection = { socket, chunks };
    connections.push(connection);
    let replied = false;
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      if (!replied && buffer.includes("\r\n\r\n")) {
        replied = true;
        const isUpgrade = UPGRADE_WEBSOCKET_PATTERN.test(
          buffer.toString("utf8")
        );
        socket.write(isUpgrade ? UPSTREAM_WS_ACCEPT : UPSTREAM_RESPONSE);
      }
    });
    socket.on("error", () => socket.destroy());
  });
  return { server, connections };
}

// Build a masked client->server WebSocket text frame (mask bit is mandatory
// for client frames).
function buildMaskedTextFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: WS mask XOR
    masked[i] = payload[i] ^ mask[i % 4];
  }
  let header;
  if (payload.length < 126) {
    // biome-ignore lint/suspicious/noBitwiseOperators: WS mask-bit + length
    header = Buffer.from([0x81, 0x80 | payload.length]);
  } else {
    const len = Buffer.alloc(2);
    len.writeUInt16BE(payload.length);
    // biome-ignore lint/suspicious/noBitwiseOperators: WS mask-bit + length
    header = Buffer.concat([Buffer.from([0x81, 0x80 | 126]), len]);
  }
  return Buffer.concat([header, mask, masked]);
}

const buildDir = await mkdtemp(path.join(tmpdir(), "capture-proxy-build-"));

try {
  writeFileSync(
    path.join(buildDir, "capture-proxy-http.js"),
    compile("capture-proxy-http.ts"),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "capture-proxy-ws.js"),
    compile("capture-proxy-ws.ts"),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "capture-proxy-facade.js"),
    compile("capture-proxy-facade.ts"),
    "utf8"
  );
  writeFileSync(
    path.join(buildDir, "capture-proxy-reverse.js"),
    compile("capture-proxy-reverse.ts"),
    "utf8"
  );
  const { NativeRequestCaptureProxy } = await import(
    pathToFileURL(path.join(buildDir, "capture-proxy-facade.js")).href
  );
  const { NativeCaptureReverseBridge } = await import(
    pathToFileURL(path.join(buildDir, "capture-proxy-reverse.js")).href
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

  // Case 3: a WebSocket upgrade on the target path is completed with the
  // upstream (deflate stripped). Codex reuses one connection for a prewarm
  // frame plus the real turn. The memory-consolidation prewarm consolidates
  // OUR probe session, so it ALSO contains the probe text — only its empty
  // `tools` array distinguishes it. `minimumToolCount: 1` selects the probe
  // turn (full tool set), not the first prewarm frame.
  const wsRule = {
    host: "api.anthropic.com",
    pathIncludes: "/v1/messages",
    bodyIncludes: "Harness AI capture probe",
    minimumToolCount: 1,
  };
  const wsProxy = buildProxy(wsRule);
  const wsHandle = await wsProxy.start();
  const wsClient = await openClientTls(wsHandle);
  wsClient.write(
    [
      "GET /v1/messages HTTP/1.1",
      "Host: api.anthropic.com",
      "Connection: Upgrade",
      "Upgrade: websocket",
      "Sec-WebSocket-Version: 13",
      "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
      "Sec-WebSocket-Extensions: permessage-deflate",
      "",
      "",
    ].join("\r\n")
  );
  // Send the request frames once the upstream 101 has been relayed back.
  await new Promise((resolve) => wsClient.once("data", resolve));
  // The prewarm frame CONTAINS the probe text (it consolidates our session)
  // but has no tools — it must be skipped by the tool-count filter.
  const prewarmFrame = JSON.stringify({
    type: "response.create",
    model: "gpt-5.4-mini",
    instructions: "Memory Writing Agent",
    tools: [],
    input: [
      { type: "text", text: "Harness AI capture probe turn (consolidated)" },
    ],
  });
  const probeFrame = JSON.stringify({
    type: "response.create",
    model: "gpt-5.5",
    instructions: "You are Codex.",
    tools: [{ name: "shell" }, { name: "apply_patch" }, { name: "web_search" }],
    input: [{ type: "text", text: "Harness AI capture probe turn" }],
  });
  // Both frames arrive on the same connection; the prewarm one comes first.
  wsClient.write(
    Buffer.concat([
      buildMaskedTextFrame(prewarmFrame),
      buildMaskedTextFrame(probeFrame),
    ])
  );
  const wsResult = await wsHandle.waitForCapture();
  await wsHandle.stop();
  wsClient.destroy();

  assert.equal(wsResult.status, "captured");
  assert.equal(wsResult.request.method, "WS");
  assert.equal(
    wsResult.request.body.instructions,
    "You are Codex.",
    "the probe-turn frame must be captured, not the prewarm frame"
  );
  assert.equal(wsResult.request.body.tools.length, 3);
  const wsUpstream = fake.connections.find((c) =>
    Buffer.concat(c.chunks).includes("Upgrade: websocket")
  );
  assert.ok(wsUpstream, "the WS upgrade should have been forwarded upstream");
  assert.ok(
    !Buffer.concat(wsUpstream.chunks)
      .toString("utf8")
      .toLowerCase()
      .includes("sec-websocket-extensions"),
    "permessage-deflate must be stripped from the forwarded upgrade"
  );

  // Case 4: the reverse-forward bridge (for clients that ignore proxy env,
  // e.g. the kimi binary). The client posts directly to the bridge base URL;
  // the bridge captures the matched request, rewrites Host to the vendor,
  // forwards it to the real upstream, and relays the response back.
  const reverseRule = {
    host: "api.kimi.com",
    pathIncludes: "/chat/completions",
    bodyIncludes: "Harness AI capture probe",
  };
  const reverseBridge = new NativeCaptureReverseBridge({
    providerId: "kimi",
    rule: reverseRule,
    timeoutMs: 4000,
    upstreamHost: "api.kimi.com",
    createUpstream: () => net.connect(fakePort, "127.0.0.1"),
  });
  const reverseHandle = await reverseBridge.start();
  assert.match(reverseHandle.baseUrl, /^http:\/\/127\.0\.0\.1:\d+$/u);
  const reverseClient = net.connect(reverseHandle.port, "127.0.0.1");
  await new Promise((resolve) => reverseClient.once("connect", resolve));
  const reverseResponse = new Promise((resolve) => {
    reverseClient.once("data", (chunk) => resolve(chunk.toString("utf8")));
  });
  const reverseBody = JSON.stringify({
    model: "kimi-for-coding",
    messages: [
      { role: "system", content: "You are Kimi Code CLI." },
      { role: "user", content: "Harness AI capture probe turn" },
    ],
    tools: [{ function: { name: "Bash" } }],
  });
  reverseClient.write(
    [
      "POST /coding/v1/chat/completions HTTP/1.1",
      "Host: 127.0.0.1",
      "Authorization: Bearer sk-kimi-secret",
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(reverseBody)}`,
      "",
      reverseBody,
    ].join("\r\n")
  );
  const reverseResult = await reverseHandle.waitForCapture();
  const reverseRelayed = await reverseResponse;
  await reverseHandle.stop();
  reverseClient.destroy();

  assert.equal(reverseResult.status, "captured");
  assert.equal(reverseResult.request.path, "/coding/v1/chat/completions");
  assert.equal(
    reverseResult.request.body.messages[0].content,
    "You are Kimi Code CLI."
  );
  assert.match(
    reverseRelayed,
    /200 OK/u,
    "client should get the relayed reply"
  );
  const reverseUpstream = fake.connections.find((c) =>
    Buffer.concat(c.chunks).includes("You are Kimi Code CLI.")
  );
  assert.ok(reverseUpstream, "upstream should receive the forwarded request");
  assert.match(
    Buffer.concat(reverseUpstream.chunks).toString("utf8"),
    /host: api\.kimi\.com/u,
    "the Host header must be rewritten to the vendor"
  );

  for (const connection of fake.connections) {
    connection.socket.destroy();
  }
  await new Promise((resolve) => fake.server.close(resolve));

  console.log("capture-proxy tests: OK");
} finally {
  await rm(buildDir, { force: true, recursive: true });
}
