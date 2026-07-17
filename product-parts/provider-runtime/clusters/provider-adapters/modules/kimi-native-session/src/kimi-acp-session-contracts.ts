// Wire contracts for the Kimi ACP session channel. The Kimi CLI speaks ACP
// v1 over newline-delimited JSON-RPC on stdio; Harness sends numeric request
// ids (the shape the CLI is verified against by the diagnostic capture
// client). Unlike the Grok channel there is no per-request cancel method on
// the wire: aborting a pending request rejects it locally and turn
// cancellation is the runtime's `session/cancel` notification.

export type KimiAcpRequestId = number | string;

export interface KimiAcpErrorShape {
  readonly code: number;
  readonly data?: unknown;
  readonly message: string;
}

export interface KimiAcpNotification {
  readonly method: string;
  readonly params?: unknown;
}

// A request initiated by the Kimi CLI toward Harness (permission asks and
// similar reverse calls). Harness must answer with a result or an error.
export interface KimiAcpReverseRequest extends KimiAcpNotification {
  readonly id: KimiAcpRequestId;
}

export type KimiAcpReverseRequestHandler = (
  request: KimiAcpReverseRequest
) => Promise<unknown> | unknown;

export interface KimiAcpInitializeResult {
  readonly agentCapabilities?: Readonly<Record<string, unknown>>;
  readonly agentInfo?: Readonly<Record<string, unknown>>;
  readonly authMethods?: readonly Readonly<Record<string, unknown>>[];
  readonly protocolVersion?: number;
}

export class KimiAcpProtocolError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(error: KimiAcpErrorShape) {
    super(error.message);
    this.name = "KimiAcpProtocolError";
    this.code = error.code;
    this.data = error.data;
  }
}

export class KimiAcpRequestTimeoutError extends Error {
  constructor(method: string, timeoutMs: number) {
    super(`Kimi ACP request ${method} timed out after ${timeoutMs} ms.`);
    this.name = "KimiAcpRequestTimeoutError";
  }
}

export class KimiAcpChannelClosedError extends Error {
  constructor(reason: string) {
    super(`Kimi ACP channel closed: ${reason}`);
    this.name = "KimiAcpChannelClosedError";
  }
}

export const KIMI_ACP_ERROR_CODES = {
  internalError: -32_603,
  methodNotFound: -32_601,
} as const;

export function isKimiAcpRequestId(value: unknown): value is KimiAcpRequestId {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function readKimiAcpError(value: unknown): KimiAcpErrorShape | null {
  if (!isKimiAcpRecord(value)) {
    return null;
  }
  if (typeof value.code !== "number" || typeof value.message !== "string") {
    return null;
  }
  return {
    code: value.code,
    ...(value.data === undefined ? {} : { data: value.data }),
    message: value.message,
  };
}

export function isKimiAcpRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
