export type GrokAcpRequestId = number | string;

export interface GrokAcpErrorShape {
  readonly code: number;
  readonly data?: unknown;
  readonly message: string;
}

export interface GrokAcpNotification {
  readonly method: string;
  readonly params?: unknown;
}

export interface GrokAcpRequest extends GrokAcpNotification {
  readonly id: GrokAcpRequestId;
}

export interface GrokAcpResponse {
  readonly error?: GrokAcpErrorShape;
  readonly id: GrokAcpRequestId;
  readonly result?: unknown;
}

export interface GrokAcpAuthMethod {
  readonly id: string;
  readonly name?: string;
}

export interface GrokAcpInitializeResult {
  readonly _meta?: Readonly<Record<string, unknown>>;
  readonly agentCapabilities?: Readonly<Record<string, unknown>>;
  readonly agentInfo?: Readonly<Record<string, unknown>>;
  readonly authMethods?: readonly GrokAcpAuthMethod[];
  readonly protocolVersion?: number;
}

export interface GrokAcpSessionSelection {
  readonly modelId?: string;
  readonly reasoningEffort?: string;
}

export type GrokAcpReverseRequestHandler = (
  request: GrokAcpRequest
) => Promise<unknown> | unknown;

export class GrokAcpProtocolError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(error: GrokAcpErrorShape) {
    super(error.message);
    this.name = "GrokAcpProtocolError";
    this.code = error.code;
    this.data = error.data;
  }
}

export class GrokAcpRequestTimeoutError extends Error {
  constructor(method: string, timeoutMs: number) {
    super(`Grok ACP request ${method} timed out after ${timeoutMs} ms.`);
    this.name = "GrokAcpRequestTimeoutError";
  }
}

export class GrokAcpRequestCancelledError extends Error {
  constructor(method: string) {
    super(`Grok ACP request ${method} was cancelled.`);
    this.name = "GrokAcpRequestCancelledError";
  }
}

export const GROK_ACP_ERROR_CODES = {
  internalError: -32_603,
  invalidRequest: -32_600,
  methodNotFound: -32_601,
  parseError: -32_700,
} as const;

export function isGrokAcpRequestId(value: unknown): value is GrokAcpRequestId {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function asGrokAcpError(value: unknown): GrokAcpErrorShape | null {
  if (!isRecord(value)) {
    return null;
  }
  const code = value.code;
  const message = value.message;
  if (typeof code !== "number" || typeof message !== "string") {
    return null;
  }
  return {
    code,
    ...(value.data === undefined ? {} : { data: value.data }),
    message,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
