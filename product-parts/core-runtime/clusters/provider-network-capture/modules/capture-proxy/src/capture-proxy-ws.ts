import type net from "node:net";
import type { CapturedNativeRequest } from "../../capture-artifacts/src/capture-artifacts-facade.js";

const LINE = "\r\n";
const HEAD_END = "\r\n\r\n";
const MIN_DATA_FRAME_BYTES = 20;
const OPCODE_TEXT = 0x1;
const OPCODE_BINARY = 0x2;
const LEN_16 = 126;
const LEN_64 = 127;
const MASK_BYTES = 4;
const OPCODE_MASK = 0x0f;
const MASK_FLAG = 0x80;
const LENGTH_MASK = 0x7f;
const SEC_WS_EXTENSIONS_LINE = /^sec-websocket-extensions:/iu;

export function isWebSocketUpgrade(
  headers: Readonly<Record<string, string>>
): boolean {
  return (headers.upgrade ?? "").toLowerCase().includes("websocket");
}

// Remove Sec-WebSocket-Extensions from the upgrade head so the server does not
// negotiate permessage-deflate; the client's frames then arrive as plain text.
function stripDeflateExtension(headText: string): string {
  return headText
    .split(LINE)
    .filter((line) => !SEC_WS_EXTENSIONS_LINE.test(line))
    .join(LINE);
}

export function parseHeadHeaders(
  headText: string
): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  const [, ...lines] = headText.split(LINE);
  for (const line of lines) {
    const sep = line.indexOf(":");
    if (sep < 0) {
      continue;
    }
    const name = line.slice(0, sep).trim().toLowerCase();
    if (name) {
      headers[name] = line.slice(sep + 1).trim();
    }
  }
  return headers;
}

interface DecodedWsFrame {
  readonly opcode: number;
  readonly payload: Buffer;
  readonly total: number;
}

// Decode one (client->server, so masked) WebSocket frame. Returns null while
// the buffer holds only a partial frame so the caller keeps accumulating.
function decodeWsFrame(buffer: Buffer): DecodedWsFrame | null {
  if (buffer.length < 2) {
    return null;
  }
  // WebSocket framing is a binary protocol; the opcode, mask flag, and length
  // live in bit fields that can only be read with bitwise operators.
  // biome-ignore lint/suspicious/noBitwiseOperators: WS frame bit fields
  const opcode = buffer[0] & OPCODE_MASK;
  // biome-ignore lint/suspicious/noBitwiseOperators: WS frame bit fields
  const masked = (buffer[1] & MASK_FLAG) !== 0;
  // biome-ignore lint/suspicious/noBitwiseOperators: WS frame bit fields
  let length = buffer[1] & LENGTH_MASK;
  let offset = 2;
  if (length === LEN_16) {
    if (buffer.length < 4) {
      return null;
    }
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === LEN_64) {
    if (buffer.length < 10) {
      return null;
    }
    length = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  let mask: Buffer | null = null;
  if (masked) {
    if (buffer.length < offset + MASK_BYTES) {
      return null;
    }
    mask = buffer.subarray(offset, offset + MASK_BYTES);
    offset += MASK_BYTES;
  }
  if (buffer.length < offset + length) {
    return null;
  }
  let payload = buffer.subarray(offset, offset + length);
  if (mask) {
    const unmasked = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
      // biome-ignore lint/suspicious/noBitwiseOperators: WS unmask XOR
      unmasked[i] = payload[i] ^ mask[i % MASK_BYTES];
    }
    payload = unmasked;
  }
  return { opcode, payload, total: offset + length };
}

function requestPath(headText: string): string {
  return headText.split(LINE)[0]?.split(" ")[1] ?? "";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// Top-level `tools` count of a decoded `response.create` frame (0 for a
// memory-consolidation prewarm, the full native set for the probe turn).
function countFrameTools(body: unknown): number {
  if (typeof body !== "object" || body === null) {
    return 0;
  }
  const tools = (body as { readonly tools?: unknown }).tools;
  return Array.isArray(tools) ? tools.length : 0;
}

export interface WebSocketRejectedFrameDetail {
  readonly frameType: string | null;
  readonly hasTopLevelTools: boolean;
  readonly payloadBytes: number;
  readonly probeMatched: boolean;
  readonly toolCount: number;
  readonly topLevelKeys: readonly string[];
}

export interface WebSocketCaptureParams {
  readonly afterHead: Buffer;
  readonly clientSocket: net.Socket;
  readonly frameIncludes?: string;
  readonly headText: string;
  readonly minimumTools?: number;
  readonly now: () => string;
  readonly onCapture: (request: CapturedNativeRequest) => void;
  readonly onFrameRejected?: (detail: WebSocketRejectedFrameDetail) => void;
  readonly target: string;
  readonly upstream: net.Socket;
}

// Completes the WS upgrade with the real upstream (deflate stripped), relays
// client->server bytes, and captures the request frame. Codex reuses one WS
// connection for several `response.create` frames (background prewarm turns
// plus the real turn), so every complete frame is decoded and the one that
// passes the filters is captured; without any filter the first data frame is
// taken. `frameIncludes` requires the probe prompt in the payload, but the
// background `memory_consolidation` turn consolidates OUR probe session, so
// the probe text also leaks into its `input` — `minimumTools` disambiguates:
// the probe turn carries the full native `tools` array (17) while the
// memory-consolidation frame has `tools: []`. Upstream->client relay is owned
// by the caller.
export function runWebSocketCapture(params: WebSocketCaptureParams): void {
  params.upstream.write(`${stripDeflateExtension(params.headText)}${HEAD_END}`);
  let buffer = Buffer.alloc(0);
  if (params.afterHead.length > 0) {
    params.upstream.write(params.afterHead);
    buffer = Buffer.concat([params.afterHead]);
  }
  let captured = false;
  const inspect = () => {
    while (!captured) {
      const frame = decodeWsFrame(buffer);
      if (!frame) {
        return;
      }
      buffer = buffer.subarray(frame.total);
      if (
        (frame.opcode !== OPCODE_TEXT && frame.opcode !== OPCODE_BINARY) ||
        frame.payload.length < MIN_DATA_FRAME_BYTES
      ) {
        continue;
      }
      const text = frame.payload.toString("utf8");
      const parsed = safeJson(text);
      const rejection = buildFrameRejectionDetail({
        frameIncludes: params.frameIncludes,
        minimumTools: params.minimumTools,
        parsed,
        payloadBytes: frame.payload.length,
        text,
      });
      if (rejection) {
        params.onFrameRejected?.(rejection);
        continue;
      }
      captured = true;
      params.onCapture({
        body: parsed,
        bodyText: text,
        headers: parseHeadHeaders(params.headText),
        method: "WS",
        path: requestPath(params.headText),
        target: params.target,
        timestamp: params.now(),
      });
    }
  };
  inspect();
  params.clientSocket.on("data", (chunk: Buffer) => {
    params.upstream.write(chunk);
    if (!captured) {
      buffer = Buffer.concat([buffer, chunk]);
      inspect();
    }
  });
}

function buildFrameRejectionDetail(options: {
  readonly frameIncludes?: string;
  readonly minimumTools?: number;
  readonly parsed: unknown;
  readonly payloadBytes: number;
  readonly text: string;
}): WebSocketRejectedFrameDetail | null {
  const probeMatched = options.frameIncludes
    ? options.text.includes(options.frameIncludes)
    : true;
  const toolCount = countFrameTools(options.parsed);
  const hasTopLevelTools =
    isJsonObject(options.parsed) && "tools" in options.parsed;
  if (
    probeMatched &&
    (typeof options.minimumTools !== "number" ||
      !hasTopLevelTools ||
      toolCount >= options.minimumTools)
  ) {
    return null;
  }
  return {
    frameType: readFrameType(options.parsed),
    hasTopLevelTools,
    payloadBytes: options.payloadBytes,
    probeMatched,
    toolCount,
    topLevelKeys: isJsonObject(options.parsed)
      ? Object.keys(options.parsed)
      : [],
  };
}

function readFrameType(body: unknown): string | null {
  if (!isJsonObject(body)) {
    return null;
  }
  return typeof body.type === "string" ? body.type : null;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
