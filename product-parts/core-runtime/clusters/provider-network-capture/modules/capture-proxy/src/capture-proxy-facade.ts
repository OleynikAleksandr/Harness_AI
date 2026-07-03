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

const DEFAULT_TIMEOUT_MS = 30_000;
const LOCAL_PROXY_HOST = "127.0.0.1";
const DEFAULT_HTTPS_PORT = 443;
const DECIMAL_RADIX = 10;

// A target model endpoint to capture; background traffic (Datadog, GitHub,
// auth checks, prewarm turns on the same endpoint) that does not match every
// set field is ignored, not captured — the proxy keeps waiting.
export interface NativeCaptureTargetRule {
  readonly bodyIncludes?: string;
  readonly host: string;
  readonly minimumToolCount?: number;
  readonly pathIncludes?: string;
  readonly port?: number;
}

// Structural metadata about a body-rejected request that matched the rule's
// host+path. Values (headers, body text) are never included — only shapes and
// counts — so it stays safe to persist in the diagnostic artifact.
export interface NativeCaptureIgnoredRequestDetail {
  readonly bodyBytes: number;
  readonly hasContentLength: boolean;
  readonly hasTransferEncoding: boolean;
  readonly probeMatched: boolean;
  readonly toolCount: number;
  readonly topLevelKeys: readonly string[];
}

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

// Local CONNECT proxy that terminates TLS with a diagnostic certificate,
// reads the provider's full HTTP request, records the first matching model
// request, and aborts with a synthetic error before anything is forwarded
// upstream (capture-and-abort). No captured request reaches the vendor.
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
    const rule = this.findConnectRule(target);
    if (!rule) {
      this.emitIgnored(target, "target_not_configured");
      socket.end("HTTP/1.1 502 Harness AI capture target ignored\r\n\r\n");
      return;
    }
    const { hostname } = parseConnectTarget(target);
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
    });
    this.trackSocket(tlsSocket);
    this.readTlsRequest(tlsSocket, target, rule);
  }

  private readTlsRequest(
    tlsSocket: tls.TLSSocket,
    target: string,
    rule: NativeCaptureTargetRule
  ): void {
    const chunks: Buffer[] = [];
    const handleHttpData = (chunk: Buffer) => {
      chunks.push(chunk);
      const parsed = parseHttpRequest(Buffer.concat(chunks));
      if (!parsed) {
        return;
      }
      const mismatch = resolveRuleMismatch(parsed, rule);
      if (mismatch) {
        this.emitIgnored(target, mismatch.reason, mismatch.detail);
        tlsSocket.end();
        return;
      }
      const request: CapturedNativeRequest = {
        ...parsed,
        target,
        timestamp: new Date().toISOString(),
      };
      tlsSocket.end(buildCapturedResponse());
      this.completeCaptured(request);
    };
    tlsSocket.on("data", handleHttpData);
    tlsSocket.on("error", () => {
      this.emitIgnored(target, "tls_socket_error");
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

interface RuleMismatch {
  readonly detail?: NativeCaptureIgnoredRequestDetail;
  readonly reason: string;
}

function resolveRuleMismatch(
  request: ParsedHttpRequest,
  rule: NativeCaptureTargetRule
): RuleMismatch | null {
  if (rule.pathIncludes && !request.path.includes(rule.pathIncludes)) {
    return { reason: "request_path_not_matched" };
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

function buildCapturedResponse(): string {
  const body = "Harness AI captured this diagnostic request locally.\n";
  return [
    "HTTP/1.1 502 Harness AI Native Request Captured",
    "Content-Type: text/plain; charset=utf-8",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "Connection: close",
    "",
    body,
  ].join("\r\n");
}
