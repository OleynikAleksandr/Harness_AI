import http from "node:http";
import type net from "node:net";
import tls from "node:tls";
import type {
  CapturedNativeRequest,
  NativeCaptureProviderId,
} from "../../capture-artifacts/src/capture-artifacts-facade.js";
import {
  type NativeCaptureProxyEvent,
  type NativeCaptureProxyResult,
  type NativeCaptureTargetRule,
  resolveRuleMismatch,
} from "./capture-proxy-facade.js";
import { parseHttpRequest } from "./capture-proxy-http.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const LOCAL_HOST = "127.0.0.1";
const DEFAULT_HTTPS_PORT = 443;
const HTTP_HEAD_SEPARATOR = "\r\n\r\n";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "proxy-connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

export interface NativeCaptureReverseBridgeHandle {
  readonly baseUrl: string;
  readonly port: number;
  stop(): Promise<void>;
  waitForCapture(): Promise<NativeCaptureProxyResult>;
}

interface NativeCaptureReverseBridgeOptions {
  // Opens the upstream connection each request is forwarded to. Defaults to a
  // real TLS socket to the upstream host; injectable so tests point at a fake
  // upstream without DNS or the network.
  readonly createUpstream?: (params: {
    readonly host: string;
    readonly port: number;
  }) => net.Socket;
  readonly onEvent?: (event: NativeCaptureProxyEvent) => void;
  readonly providerId: NativeCaptureProviderId;
  readonly rule: NativeCaptureTargetRule;
  readonly timeoutMs?: number;
  readonly upstreamHost: string;
  readonly upstreamPort?: number;
}

interface PendingCapture {
  readonly promise: Promise<NativeCaptureProxyResult>;
  readonly resolve: (result: NativeCaptureProxyResult) => void;
  readonly timeout: NodeJS.Timeout;
}

// Local reverse-forward bridge: a plain 127.0.0.1 HTTP listener the driven
// client points its API base_url at directly (NOT a CONNECT proxy). Each
// request is buffered, forwarded 1:1 to the real TLS upstream with only the
// Host header rewritten, and the response is relayed back, so the request
// reaches the vendor. The first request matching the target rule
// (`pathIncludes` + `bodyIncludes`) is captured. This is how a client that
// ignores proxy env (the kimi Mach-O binary) is still transited.
export class NativeCaptureReverseBridge {
  private readonly options: NativeCaptureReverseBridgeOptions;
  private readonly sockets = new Set<net.Socket>();
  private pendingCapture: PendingCapture | null = null;
  private server: http.Server | null = null;

  constructor(options: NativeCaptureReverseBridgeOptions) {
    this.options = options;
  }

  async start(): Promise<NativeCaptureReverseBridgeHandle> {
    if (this.server) {
      throw new Error("Native capture reverse bridge is already started");
    }
    const server = http.createServer();
    this.server = server;
    this.pendingCapture = this.createPendingCapture();
    server.on("connection", (socket) => {
      this.trackSocket(socket);
      this.handleConnection(socket);
    });
    server.on("clientError", (_error, socket) => socket.destroy());
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, LOCAL_HOST, () => {
        server.off("error", reject);
        resolve();
      });
    });
    const address = server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Native capture reverse bridge failed to bind TCP port");
    }
    return {
      baseUrl: `http://${LOCAL_HOST}:${address.port}`,
      port: address.port,
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private handleConnection(clientSocket: net.Socket): void {
    const chunks: Buffer[] = [];
    let routed = false;
    const onData = (chunk: Buffer): void => {
      chunks.push(chunk);
      if (routed) {
        return;
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.indexOf(HTTP_HEAD_SEPARATOR) < 0) {
        return; // wait for the full head
      }
      const parsed = parseHttpRequest(buffer);
      if (!parsed) {
        return; // head seen but body still incomplete
      }
      routed = true;
      clientSocket.off("data", onData);
      this.forwardRequest(clientSocket, parsed);
    };
    clientSocket.on("data", onData);
    clientSocket.on("error", () => clientSocket.destroy());
  }

  private forwardRequest(
    clientSocket: net.Socket,
    parsed: ReturnType<typeof parseHttpRequest> & object
  ): void {
    const target = `${this.options.upstreamHost}:${this.upstreamPort()}`;
    this.emit({ type: "proxy_connect", target });
    const upstream = this.connectUpstream();
    this.trackSocket(upstream);
    upstream.on("data", (chunk: Buffer) => clientSocket.write(chunk));
    upstream.on("error", () => clientSocket.destroy());
    upstream.on("close", () => clientSocket.destroy());
    clientSocket.on("close", () => upstream.destroy());
    upstream.write(this.rewriteRequest(parsed));
    this.evaluateCapture(parsed, target);
  }

  private evaluateCapture(
    parsed: NonNullable<ReturnType<typeof parseHttpRequest>>,
    target: string
  ): void {
    const mismatch = resolveRuleMismatch(parsed, this.options.rule);
    if (mismatch) {
      this.emit(
        mismatch.detail
          ? {
              detail: mismatch.detail,
              reason: mismatch.reason,
              target,
              type: "request_ignored",
            }
          : { reason: mismatch.reason, target, type: "request_ignored" }
      );
      return;
    }
    const captured: CapturedNativeRequest = {
      body: parsed.body,
      bodyText: parsed.bodyText,
      headers: parsed.headers,
      method: parsed.method,
      path: parsed.path,
      target,
      timestamp: new Date().toISOString(),
    };
    this.consumePendingCapture()?.resolve({
      request: captured,
      status: "captured",
    });
  }

  // Rebuilds the raw request for the upstream: the Host header is rewritten to
  // the real vendor, hop-by-hop headers are dropped, and the (already decoded)
  // body is sent with an exact Content-Length so a chunked client body becomes
  // a plain framed one the upstream accepts.
  private rewriteRequest(
    parsed: NonNullable<ReturnType<typeof parseHttpRequest>>
  ): Buffer {
    const lines = [`${parsed.method} ${parsed.path} HTTP/1.1`];
    for (const [name, value] of Object.entries(parsed.headers)) {
      if (name === "host" || name === "content-length") {
        continue;
      }
      if (HOP_BY_HOP_HEADERS.has(name)) {
        continue;
      }
      lines.push(`${name}: ${value}`);
    }
    lines.push(`host: ${this.options.upstreamHost}`);
    lines.push(`content-length: ${Buffer.byteLength(parsed.bodyText, "utf8")}`);
    return Buffer.from(
      `${lines.join("\r\n")}${HTTP_HEAD_SEPARATOR}${parsed.bodyText}`,
      "utf8"
    );
  }

  private connectUpstream(): net.Socket {
    const host = this.options.upstreamHost;
    const port = this.upstreamPort();
    if (this.options.createUpstream) {
      return this.options.createUpstream({ host, port });
    }
    return tls.connect({
      ALPNProtocols: ["http/1.1"],
      host,
      port,
      servername: host,
    });
  }

  private upstreamPort(): number {
    return this.options.upstreamPort ?? DEFAULT_HTTPS_PORT;
  }

  private createPendingCapture(): PendingCapture {
    let resolveCapture: PendingCapture["resolve"] | null = null;
    const promise = new Promise<NativeCaptureProxyResult>((resolve) => {
      resolveCapture = resolve;
    });
    const timeout = setTimeout(() => {
      const pending = this.consumePendingCapture();
      pending?.resolve({ reason: "timeout", status: "timeout" });
      this.stop().catch(() => undefined);
    }, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    return {
      promise,
      resolve: (result) => resolveCapture?.(result),
      timeout,
    };
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

  private trackSocket(socket: net.Socket): void {
    this.sockets.add(socket);
    socket.once("close", () => this.sockets.delete(socket));
  }
}
