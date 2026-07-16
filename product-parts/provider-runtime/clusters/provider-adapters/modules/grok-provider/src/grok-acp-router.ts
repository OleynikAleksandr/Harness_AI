import {
  asGrokAcpError,
  GROK_ACP_ERROR_CODES,
  type GrokAcpNotification,
  GrokAcpProtocolError,
  type GrokAcpRequest,
  GrokAcpRequestCancelledError,
  type GrokAcpRequestId,
  GrokAcpRequestTimeoutError,
  type GrokAcpReverseRequestHandler,
  isGrokAcpRequestId,
  isRecord,
} from "./grok-acp-contracts.js";

interface PendingRequest {
  readonly abortListener?: () => void;
  readonly method: string;
  readonly reject: (error: Error) => void;
  readonly resolve: (result: unknown) => void;
  readonly signal?: AbortSignal;
  readonly timeout: ReturnType<typeof setTimeout>;
}

export interface GrokAcpRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface GrokAcpRouterOptions {
  readonly onNotification?: (notification: GrokAcpNotification) => void;
  readonly onProtocolError?: (error: Error) => void;
  readonly onReverseRequest?: GrokAcpReverseRequestHandler;
  readonly requestTimeoutMs?: number;
  readonly sendLine: (line: string) => Promise<void> | void;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

export class GrokAcpRouter {
  readonly #options: GrokAcpRouterOptions;
  readonly #pendingRequests = new Map<GrokAcpRequestId, PendingRequest>();
  #requestCounter = 0;

  constructor(options: GrokAcpRouterOptions) {
    this.#options = options;
  }

  get pendingRequestCount(): number {
    return this.#pendingRequests.size;
  }

  async request<TResult = unknown>(
    method: string,
    params?: unknown,
    options: GrokAcpRequestOptions = {}
  ): Promise<TResult> {
    if (options.signal?.aborted) {
      throw new GrokAcpRequestCancelledError(method);
    }
    const id = `harness-grok-${++this.#requestCounter}`;
    const timeoutMs =
      options.timeoutMs ??
      this.#options.requestTimeoutMs ??
      DEFAULT_REQUEST_TIMEOUT_MS;
    const promise = new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#rejectPending(
          id,
          new GrokAcpRequestTimeoutError(method, timeoutMs)
        );
      }, timeoutMs);
      const abortListener = options.signal
        ? () => {
            this.#rejectPending(id, new GrokAcpRequestCancelledError(method));
            this.notify("$/cancelRequest", { id }).catch((error) => {
              this.#reportProtocolError(toError(error));
            });
          }
        : undefined;
      options.signal?.addEventListener("abort", abortListener ?? noop, {
        once: true,
      });
      this.#pendingRequests.set(id, {
        abortListener,
        method,
        reject,
        resolve,
        signal: options.signal,
        timeout,
      });
    });

    try {
      await this.#send({
        id,
        jsonrpc: "2.0",
        method,
        ...(params === undefined ? {} : { params }),
      });
    } catch (error) {
      this.#rejectPending(id, toError(error));
    }
    return (await promise) as TResult;
  }

  notify(method: string, params?: unknown): Promise<void> {
    return this.#send({
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
    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      this.#reportProtocolError(new Error("Grok ACP emitted invalid JSON."));
      return;
    }
    if (!isRecord(payload)) {
      this.#reportProtocolError(new Error("Grok ACP emitted a non-object."));
      return;
    }
    const id = payload.id;
    const method = asMethod(payload.method);
    if (method && isGrokAcpRequestId(id)) {
      this.#handleReverseRequest({
        id,
        method,
        ...(payload.params === undefined ? {} : { params: payload.params }),
      }).catch((error) => {
        this.#reportProtocolError(toError(error));
      });
      return;
    }
    if (method) {
      this.#options.onNotification?.({
        method,
        ...(payload.params === undefined ? {} : { params: payload.params }),
      });
      return;
    }
    if (isGrokAcpRequestId(id)) {
      this.#handleResponse(id, payload);
      return;
    }
    this.#reportProtocolError(
      new Error("Grok ACP emitted an unknown message.")
    );
  }

  rejectAll(reason: Error): void {
    for (const id of [...this.#pendingRequests.keys()]) {
      this.#rejectPending(id, reason);
    }
  }

  #handleResponse(
    id: GrokAcpRequestId,
    payload: Record<string, unknown>
  ): void {
    const pending = this.#takePending(id);
    if (!pending) {
      this.#reportProtocolError(
        new Error(`Grok ACP returned an unknown request id: ${String(id)}.`)
      );
      return;
    }
    const error = asGrokAcpError(payload.error);
    if (error) {
      pending.reject(new GrokAcpProtocolError(error));
      return;
    }
    pending.resolve(payload.result);
  }

  async #handleReverseRequest(request: GrokAcpRequest): Promise<void> {
    const handler = this.#options.onReverseRequest;
    if (!handler) {
      await this.#sendError(request.id, {
        code: GROK_ACP_ERROR_CODES.methodNotFound,
        message: `Unsupported Grok ACP reverse request: ${request.method}`,
      });
      return;
    }
    try {
      const result = await handler(request);
      await this.#send({ id: request.id, jsonrpc: "2.0", result });
    } catch (error) {
      const failure = toError(error);
      await this.#sendError(request.id, {
        code:
          error instanceof GrokAcpProtocolError
            ? error.code
            : GROK_ACP_ERROR_CODES.internalError,
        data: error instanceof GrokAcpProtocolError ? error.data : undefined,
        message: failure.message,
      });
    }
  }

  #sendError(
    id: GrokAcpRequestId,
    error: {
      readonly code: number;
      readonly data?: unknown;
      readonly message: string;
    }
  ): Promise<void> {
    return this.#send({ id, jsonrpc: "2.0", error });
  }

  async #send(payload: Readonly<Record<string, unknown>>): Promise<void> {
    await this.#options.sendLine(`${JSON.stringify(payload)}\n`);
  }

  #rejectPending(id: GrokAcpRequestId, error: Error): void {
    const pending = this.#takePending(id);
    pending?.reject(error);
  }

  #takePending(id: GrokAcpRequestId): PendingRequest | null {
    const pending = this.#pendingRequests.get(id);
    if (!pending) {
      return null;
    }
    this.#pendingRequests.delete(id);
    clearTimeout(pending.timeout);
    if (pending.abortListener) {
      pending.signal?.removeEventListener("abort", pending.abortListener);
    }
    return pending;
  }

  #reportProtocolError(error: Error): void {
    this.#options.onProtocolError?.(error);
  }
}

const asMethod = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const noop = (): void => undefined;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));
