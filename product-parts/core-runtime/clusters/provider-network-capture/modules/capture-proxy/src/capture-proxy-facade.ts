import http from "node:http";
import net from "node:net";
import tls from "node:tls";
import type {
  CapturedNativeRequest,
  NativeCaptureFailureReason,
  NativeCaptureProviderId,
} from "../../capture-artifacts/src/capture-artifacts-facade.js";
import type { NativeCaptureTlsCredentials } from "../../capture-certificates/src/capture-certificates-facade.js";
import {
  type ParsedHttpRequest,
  parseHttpRequest,
} from "./capture-proxy-http.js";
import {
  buildTlsErrorDetail,
  type NativeCaptureTlsErrorDetail,
} from "./capture-proxy-tls-error.js";
import {
  isWebSocketUpgrade,
  parseHeadHeaders,
  runWebSocketCapture,
  type WebSocketRejectedFrameDetail,
} from "./capture-proxy-ws.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const LOCAL_PROXY_HOST = "127.0.0.1";
const DEFAULT_HTTPS_PORT = 443;
const DECIMAL_RADIX = 10;
const HTTP_HEAD_SEPARATOR = "\r\n\r\n";

export interface NativeCaptureTargetRule {
  readonly bodyIncludes?: string;
  readonly host: string;
  readonly minimumToolCount?: number;
  readonly pathIncludes?: string;
  readonly port?: number;
}

export interface NativeCaptureBodyMismatchDetail {
  readonly bodyBytes: number;
  readonly hasContentLength: boolean;
  readonly hasTransferEncoding: boolean;
  readonly probeMatched: boolean;
  readonly requestPath: string;
  readonly toolCount: number;
  readonly topLevelKeys: readonly string[];
}

export type NativeCaptureIgnoredRequestDetail =
  | NativeCaptureBodyMismatchDetail
  | NativeCaptureTlsErrorDetail
  | WebSocketRejectedFrameDetail;

export type NativeCaptureProxyEvent =
  | { readonly target: string; readonly type: "proxy_connect" }
  | {
      readonly detail?: NativeCaptureIgnoredRequestDetail;
      readonly reason: string;
      readonly target: string;
      readonly type: "request_ignored";
    };

export type NativeCaptureProxyResult =
  | { readonly request: CapturedNativeRequest; readonly status: "captured" }
  | {
      readonly reason: NativeCaptureFailureReason;
      readonly status: "failed" | "timeout";
    };

export interface NativeCaptureProxyHandle {
  readonly port: number;
  readonly proxyUrl: string;
  stop(): Promise<void>;
  waitForCapture(): Promise<NativeCaptureProxyResult>;
}

interface NativeCaptureProxyOptions {
  // Opens the upstream connection a target request is forwarded to. Defaults to
  // a real TLS socket to the rule host; injectable so tests point at a fake
  // upstream without DNS or the network.
  readonly createUpstream?: (params: {
    readonly host: string;
    readonly port: number;
  }) => net.Socket;
  readonly onEvent?: (event: NativeCaptureProxyEvent) => void;
  readonly providerId: NativeCaptureProviderId;
  readonly resolveTlsCredentials: (params: {
    readonly hostname: string;
  }) => NativeCaptureTlsCredentials | Promise<NativeCaptureTlsCredentials>;
  readonly targetRules: readonly NativeCaptureTargetRule[];
  readonly timeoutMs?: number;
}

interface PendingCapture {
  readonly promise: Promise<NativeCaptureProxyResult>;
  readonly resolve: (result: NativeCaptureProxyResult) => void;
  readonly timeout: NodeJS.Timeout;
}

// Local CONNECT proxy that MITM-terminates TLS for target hosts, forwards the
// request to the real upstream, relays the response back, and records the first
// request matching a target rule (forward transit). Non-target hosts are blind
// TCP tunnels so the driven client keeps working. The request DOES reach the
// vendor — this is required to capture Codex's mandatory WebSocket transport,
// whose payload only exists in frames sent after a real upgrade handshake.
export class NativeRequestCaptureProxy {
  private readonly options: NativeCaptureProxyOptions;
  private readonly sockets = new Set<net.Socket>();
  private pendingCapture: PendingCapture | null = null;
  private server: http.Server | null = null;

  constructor(options: NativeCaptureProxyOptions) {
    this.options = options;
  }

  async start(): Promise<NativeCaptureProxyHandle> {
    if (this.server) {
      throw new Error("Native request capture proxy is already started");
    }
    const server = http.createServer();
    this.server = server;
    this.pendingCapture = this.createPendingCapture();
    server.on("connect", (request, socket, head) => {
      if (socket instanceof net.Socket) {
        this.handleConnect(request, socket, head).catch(() => {
          socket.destroy();
        });
        return;
      }
      socket.destroy();
    });
    server.on("clientError", (_error, socket) => {
      socket.destroy();
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, LOCAL_PROXY_HOST, () => {
        server.off("error", reject);
        resolve();
      });
    });
    const address = server.address();
    if (!isTcpAddress(address)) {
      throw new Error("Native request capture proxy failed to bind TCP port");
    }
    return {
      port: address.port,
      proxyUrl: `http://${LOCAL_PROXY_HOST}:${address.port}`,
      stop: () => this.stop(),
      waitForCapture: () =>
        this.pendingCapture?.promise ??
        Promise.resolve({ status: "failed", reason: "runtime_failed" }),
    };
  }

  async stop(): Promise<void> {
    this.consumePendingCapture()?.resolve({
      status: "failed",
      reason: "runtime_failed",
    });
    const server = this.server;
    this.server = null;
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    if (!server?.listening) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async handleConnect(
    request: http.IncomingMessage,
    socket: net.Socket,
    head: Buffer
  ): Promise<void> {
    const target = request.url ?? "";
    this.trackSocket(socket);
    this.emit({ type: "proxy_connect", target });
    const { hostname, port } = parseConnectTarget(target);
    const rule = this.findConnectRule(target);
    if (!rule) {
      // Non-target host: blind TCP tunnel so background traffic (auth, models,
      // other providers) still reaches its real server and the client works.
      this.blindTunnel(socket, hostname, port, head);
      return;
    }
    const credentials = await this.resolveCredentials(hostname);
    if (!credentials) {
      socket.end("HTTP/1.1 502 TLS credentials unavailable\r\n\r\n");
      this.completeFailure("tls_trust_failed");
      return;
    }
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      socket.unshift(head);
    }
    const tlsSocket = new tls.TLSSocket(socket, {
      isServer: true,
      secureContext: tls.createSecureContext(credentials),
      // Force HTTP/1.1 so HTTP providers stay parseable and the WS upgrade is a
      // plain HTTP/1.1 request; without this the client may pick h2.
      ALPNProtocols: ["http/1.1"],
    });
    this.trackSocket(tlsSocket);
    this.forwardAndInspect(tlsSocket, target, rule, hostname, port);
  }

  private blindTunnel(
    clientSocket: net.Socket,
    hostname: string,
    port: number,
    head: Buffer
  ): void {
    const upstream = net.connect(port, hostname, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) {
        upstream.write(head);
      }
      clientSocket.pipe(upstream);
      upstream.pipe(clientSocket);
    });
    this.trackSocket(upstream);
    upstream.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => upstream.destroy());
  }

  private forwardAndInspect(
    tlsSocket: tls.TLSSocket,
    target: string,
    rule: NativeCaptureTargetRule,
    hostname: string,
    port: number
  ): void {
    const upstream = this.connectUpstream(hostname, port);
    this.trackSocket(upstream);
    upstream.on("data", (chunk: Buffer) => tlsSocket.write(chunk));
    upstream.on("error", () => tlsSocket.destroy());
    upstream.on("close", () => tlsSocket.destroy());
    tlsSocket.on("error", (error) => {
      this.emitIgnored(target, "tls_socket_error", buildTlsErrorDetail(error));
      upstream.destroy();
    });
    tlsSocket.on("close", () => upstream.destroy());
    this.inspectClientRequest(tlsSocket, upstream, target, rule);
  }

  private inspectClientRequest(
    tlsSocket: tls.TLSSocket,
    upstream: net.Socket,
    target: string,
    rule: NativeCaptureTargetRule
  ): void {
    const chunks: Buffer[] = [];
    let mode: "detect" | "http" = "detect";
    let forwarded = 0;
    let inspected = false;
    const onClientData = (chunk: Buffer) => {
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      if (mode === "detect") {
        const headEnd = buffer.indexOf(HTTP_HEAD_SEPARATOR);
        if (headEnd < 0) {
          return; // wait for the full head before routing; do not forward yet
        }
        const headText = buffer.subarray(0, headEnd).toString("utf8");
        const path = headText.split("\r\n")[0]?.split(" ")[1] ?? "";
        const pathOk = !rule.pathIncludes || path.includes(rule.pathIncludes);
        if (isWebSocketUpgrade(parseHeadHeaders(headText)) && pathOk) {
          tlsSocket.off("data", onClientData);
          runWebSocketCapture({
            afterHead: buffer.subarray(headEnd + HTTP_HEAD_SEPARATOR.length),
            clientSocket: tlsSocket,
            frameIncludes: rule.bodyIncludes,
            headText,
            minimumTools: rule.minimumToolCount,
            now: () => new Date().toISOString(),
            onCapture: (request) => this.completeCaptured(request),
            onFrameRejected: (detail) =>
              this.emitIgnored(target, "websocket_frame_not_matched", detail),
            target,
            upstream,
          });
          return;
        }
        mode = "http";
      }
      if (buffer.length > forwarded) {
        upstream.write(buffer.subarray(forwarded));
        forwarded = buffer.length;
      }
      if (inspected) {
        return;
      }
      const parsed = parseHttpRequest(buffer);
      if (!parsed) {
        return;
      }
      inspected = true;
      const mismatch = resolveRuleMismatch(parsed, rule);
      if (mismatch) {
        this.emitIgnored(target, mismatch.reason, mismatch.detail);
        return;
      }
      this.completeCaptured({
        ...parsed,
        target,
        timestamp: new Date().toISOString(),
      });
    };
    tlsSocket.on("data", onClientData);
  }

  private connectUpstream(hostname: string, port: number): net.Socket {
    if (this.options.createUpstream) {
      return this.options.createUpstream({ host: hostname, port });
    }
    return tls.connect({
      host: hostname,
      port,
      servername: hostname,
      ALPNProtocols: ["http/1.1"],
    });
  }

  private createPendingCapture(): PendingCapture {
    let resolveCapture: PendingCapture["resolve"] | null = null;
    const promise = new Promise<NativeCaptureProxyResult>((resolve) => {
      resolveCapture = resolve;
    });
    const timeout = setTimeout(() => {
      this.completeTimeout();
    }, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    return {
      promise,
      resolve: (result) => resolveCapture?.(result),
      timeout,
    };
  }

  private completeCaptured(request: CapturedNativeRequest): void {
    this.consumePendingCapture()?.resolve({ status: "captured", request });
  }

  private completeFailure(reason: NativeCaptureFailureReason): void {
    this.consumePendingCapture()?.resolve({ status: "failed", reason });
  }

  private completeTimeout(): void {
    const pending = this.consumePendingCapture();
    if (!pending) {
      return;
    }
    pending.resolve({ status: "timeout", reason: "timeout" });
    this.stop().catch(() => undefined);
  }

  private consumePendingCapture(): PendingCapture | null {
    const pending = this.pendingCapture;
    if (!pending) {
      return null;
    }
    clearTimeout(pending.timeout);
    this.pendingCapture = null;
    return pending;
  }

  private emit(event: NativeCaptureProxyEvent): void {
    this.options.onEvent?.(event);
  }

  private emitIgnored(
    target: string,
    reason: string,
    detail?: NativeCaptureIgnoredRequestDetail
  ): void {
    this.emit(
      detail
        ? { type: "request_ignored", target, reason, detail }
        : { type: "request_ignored", target, reason }
    );
  }

  private findConnectRule(target: string): NativeCaptureTargetRule | null {
    const parsed = parseConnectTarget(target);
    if (!parsed.hostname) {
      return null;
    }
    return (
      this.options.targetRules.find(
        (rule) =>
          rule.host === parsed.hostname &&
          (rule.port ?? DEFAULT_HTTPS_PORT) === parsed.port
      ) ?? null
    );
  }

  private async resolveCredentials(
    hostname: string
  ): Promise<NativeCaptureTlsCredentials | null> {
    try {
      return await this.options.resolveTlsCredentials({ hostname });
    } catch {
      return null;
    }
  }

  private trackSocket(socket: net.Socket): void {
    this.sockets.add(socket);
    socket.once("close", () => {
      this.sockets.delete(socket);
    });
  }
}

function isTcpAddress(
  address: string | net.AddressInfo | null
): address is net.AddressInfo {
  return typeof address === "object" && address !== null && "port" in address;
}

function parseConnectTarget(target: string): {
  readonly hostname: string;
  readonly port: number;
} {
  const [hostname = "", portRaw = "443"] = target.split(":");
  const port = Number.parseInt(portRaw, DECIMAL_RADIX);
  return { hostname, port: Number.isFinite(port) ? port : DEFAULT_HTTPS_PORT };
}

export interface RuleMismatch {
  readonly detail?: NativeCaptureIgnoredRequestDetail;
  readonly reason: string;
}

export function resolveRuleMismatch(
  request: ParsedHttpRequest,
  rule: NativeCaptureTargetRule
): RuleMismatch | null {
  if (rule.pathIncludes && !request.path.includes(rule.pathIncludes)) {
    return {
      reason: "request_path_not_matched",
      detail: buildIgnoredRequestDetail(request, rule),
    };
  }
  // Host+path matched: any body rejection from here carries a diagnostic
  // detail so the artifact shows why the target request was not captured.
  if (rule.bodyIncludes && !request.bodyText.includes(rule.bodyIncludes)) {
    return {
      reason: "request_body_not_matched",
      detail: buildIgnoredRequestDetail(request, rule),
    };
  }
  if (
    typeof rule.minimumToolCount === "number" &&
    countRequestTools(request.body) < rule.minimumToolCount
  ) {
    return {
      reason: "request_body_not_matched",
      detail: buildIgnoredRequestDetail(request, rule),
    };
  }
  return null;
}

function buildIgnoredRequestDetail(
  request: ParsedHttpRequest,
  rule: NativeCaptureTargetRule
): NativeCaptureIgnoredRequestDetail {
  return {
    bodyBytes: Buffer.byteLength(request.bodyText, "utf8"),
    hasContentLength: "content-length" in request.headers,
    hasTransferEncoding: "transfer-encoding" in request.headers,
    probeMatched: rule.bodyIncludes
      ? request.bodyText.includes(rule.bodyIncludes)
      : true,
    requestPath: request.path.split("?", 1)[0] ?? request.path,
    toolCount: countRequestTools(request.body),
    topLevelKeys: isJsonObject(request.body) ? Object.keys(request.body) : [],
  };
}

function countRequestTools(body: unknown): number {
  const tools = (body as { readonly tools?: unknown } | null)?.tools;
  return Array.isArray(tools) ? tools.length : 0;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
