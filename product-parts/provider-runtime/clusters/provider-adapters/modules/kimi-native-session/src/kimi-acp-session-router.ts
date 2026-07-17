import {
  isKimiAcpRecord,
  isKimiAcpRequestId,
  KIMI_ACP_ERROR_CODES,
  type KimiAcpNotification,
  KimiAcpProtocolError,
  KimiAcpRequestTimeoutError,
  type KimiAcpReverseRequest,
  type KimiAcpReverseRequestHandler,
  readKimiAcpError,
} from "./kimi-acp-session-contracts.js";

export interface KimiAcpRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface KimiAcpSessionRouterOptions {
  readonly onNotification?: (notification: KimiAcpNotification) => void;
  readonly onProtocolError?: (error: Error) => void;
  readonly onReverseRequest?: KimiAcpReverseRequestHandler;
  readonly requestTimeoutMs?: number;
  readonly sendLine: (line: string) => Promise<void> | void;
}

interface PendingKimiRequest {
  readonly cleanup: () => void;
  readonly reject: (error: Error) => void;
  readonly resolve: (result: unknown) => void;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

// JSON-RPC correlation for one Kimi ACP channel: outbound requests carry
// numeric ids; inbound lines split into responses (matched by id),
// CLI-initiated reverse requests (answered through the handler) and
// notifications. Aborting a pending request rejects it locally only — the
// Kimi wire has no request-cancel method.
export class KimiAcpSessionRouter {
  private nextRequestId = 1;
  private readonly options: KimiAcpSessionRouterOptions;
  private readonly pending = new Map<number, PendingKimiRequest>();

  constructor(options: KimiAcpSessionRouterOptions) {
    this.options = options;
  }

  get pendingRequestCount(): number {
    return this.pending.size;
  }

  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    options: KimiAcpRequestOptions = {}
  ): Promise<TResult> {
    const id = this.nextRequestId++;
    const timeoutMs =
      options.timeoutMs ??
      this.options.requestTimeoutMs ??
      DEFAULT_REQUEST_TIMEOUT_MS;
    const result = new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.settle(id)?.reject(
          new KimiAcpRequestTimeoutError(method, timeoutMs)
        );
      }, timeoutMs);
      const onAbort = (): void => {
        this.settle(id)?.reject(
          new Error(`Kimi ACP request ${method} was aborted.`)
        );
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      this.pending.set(id, {
        cleanup: () => {
          clearTimeout(timeout);
          options.signal?.removeEventListener("abort", onAbort);
        },
        reject,
        resolve,
      });
      if (options.signal?.aborted) {
        onAbort();
      }
    });
    try {
      await this.send({
        id,
        jsonrpc: "2.0",
        method,
        ...(params === undefined ? {} : { params }),
      });
    } catch (error) {
      this.settle(id)?.reject(asError(error));
    }
    return (await result) as TResult;
  }

  notify(method: string, params?: unknown): Promise<void> {
    return this.send({
      jsonrpc: "2.0",
      method,
      ...(params === undefined ? {} : { params }),
    });
  }

  handleLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    let message: unknown;
    try {
      message = JSON.parse(trimmed);
    } catch {
      this.options.onProtocolError?.(
        new Error("Kimi ACP emitted invalid JSON.")
      );
      return;
    }
    if (!isKimiAcpRecord(message)) {
      this.options.onProtocolError?.(
        new Error("Kimi ACP emitted a non-object message.")
      );
      return;
    }
    if (typeof message.method === "string" && message.method) {
      if (isKimiAcpRequestId(message.id)) {
        this.answerReverseRequest({
          id: message.id,
          method: message.method,
          ...(message.params === undefined ? {} : { params: message.params }),
        }).catch((error) => this.options.onProtocolError?.(asError(error)));
        return;
      }
      this.options.onNotification?.({
        method: message.method,
        ...(message.params === undefined ? {} : { params: message.params }),
      });
      return;
    }
    if (typeof message.id === "number") {
      this.resolveResponse(message.id, message);
      return;
    }
    this.options.onProtocolError?.(
      new Error("Kimi ACP emitted an uncorrelated message.")
    );
  }

  rejectAll(reason: Error): void {
    for (const id of [...this.pending.keys()]) {
      this.settle(id)?.reject(reason);
    }
  }

  private resolveResponse(id: number, message: Record<string, unknown>): void {
    const entry = this.settle(id);
    if (!entry) {
      this.options.onProtocolError?.(
        new Error(`Kimi ACP answered an unknown request id: ${id}.`)
      );
      return;
    }
    const wireError = readKimiAcpError(message.error);
    if (wireError) {
      entry.reject(new KimiAcpProtocolError(wireError));
      return;
    }
    entry.resolve(message.result);
  }

  private async answerReverseRequest(
    request: KimiAcpReverseRequest
  ): Promise<void> {
    const handler = this.options.onReverseRequest;
    if (!handler) {
      await this.sendCaughtError(request.id, {
        code: KIMI_ACP_ERROR_CODES.methodNotFound,
        message: `Unsupported Kimi ACP reverse request: ${request.method}`,
      });
      return;
    }
    try {
      const result = await handler(request);
      await this.send({ id: request.id, jsonrpc: "2.0", result: result ?? {} });
    } catch (error) {
      await this.sendCaughtError(request.id, {
        code:
          error instanceof KimiAcpProtocolError
            ? error.code
            : KIMI_ACP_ERROR_CODES.internalError,
        message: asError(error).message,
      });
    }
  }

  private async sendCaughtError(
    id: KimiAcpReverseRequest["id"],
    error: { readonly code: number; readonly message: string }
  ): Promise<void> {
    try {
      await this.send({ error, id, jsonrpc: "2.0" });
    } catch (sendError) {
      this.options.onProtocolError?.(asError(sendError));
    }
  }

  private settle(id: number): PendingKimiRequest | null {
    const entry = this.pending.get(id);
    if (!entry) {
      return null;
    }
    this.pending.delete(id);
    entry.cleanup();
    return entry;
  }

  private async send(
    payload: Readonly<Record<string, unknown>>
  ): Promise<void> {
    await this.options.sendLine(`${JSON.stringify(payload)}\n`);
  }
}

const asError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));
