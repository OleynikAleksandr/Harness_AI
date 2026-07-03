const HTTP_HEADER_SEPARATOR = "\r\n\r\n";
const HTTP_LINE_SEPARATOR = "\r\n";
const DECIMAL_RADIX = 10;
const HEX_RADIX = 16;

export interface ParsedHttpRequest {
  readonly body: unknown;
  readonly bodyText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: string;
}

// Parses a buffered client request, or returns null while the head or body is
// still incomplete so the caller keeps buffering more socket data.
export function parseHttpRequest(buffer: Buffer): ParsedHttpRequest | null {
  const headerEnd = buffer.indexOf(HTTP_HEADER_SEPARATOR);
  if (headerEnd < 0) {
    return null;
  }
  const headerText = buffer.subarray(0, headerEnd).toString("utf8");
  const [requestLine = "", ...headerLines] =
    headerText.split(HTTP_LINE_SEPARATOR);
  const [method = "", requestPath = ""] = requestLine.split(" ");
  const headers = parseHeaders(headerLines);
  const bodyStart = headerEnd + HTTP_HEADER_SEPARATOR.length;
  const bodyText = readRequestBody(buffer, bodyStart, headers);
  if (bodyText === null) {
    return null;
  }
  return {
    body: parseBody(bodyText),
    bodyText,
    headers,
    method,
    path: requestPath,
  };
}

// Returns the full request body, or null while it is still incomplete so the
// caller keeps buffering. Codex streams the responses POST with
// `Transfer-Encoding: chunked` and no `Content-Length`; without chunked
// decoding a missing Content-Length would read as an empty body and the probe
// request would be rejected before its body ever arrives.
function readRequestBody(
  buffer: Buffer,
  bodyStart: number,
  headers: Readonly<Record<string, string>>
): string | null {
  if (isChunkedTransfer(headers)) {
    return readChunkedBody(buffer, bodyStart);
  }
  const contentLength = Number.parseInt(
    headers["content-length"] ?? "0",
    DECIMAL_RADIX
  );
  const safeContentLength = Number.isFinite(contentLength) ? contentLength : 0;
  const bodyEnd = bodyStart + safeContentLength;
  if (buffer.length < bodyEnd) {
    return null;
  }
  return buffer.subarray(bodyStart, bodyEnd).toString("utf8");
}

function isChunkedTransfer(headers: Readonly<Record<string, string>>): boolean {
  return (headers["transfer-encoding"] ?? "").toLowerCase().includes("chunked");
}

// Decodes a chunked body: each chunk is a hex size line, the data, and a
// trailing CRLF, ending with a zero-size chunk. Returns null while any chunk
// is only partially buffered so the caller waits for the rest.
function readChunkedBody(buffer: Buffer, start: number): string | null {
  const parts: Buffer[] = [];
  let offset = start;
  for (;;) {
    const lineEnd = buffer.indexOf(HTTP_LINE_SEPARATOR, offset);
    if (lineEnd < 0) {
      return null;
    }
    const sizeToken = buffer
      .subarray(offset, lineEnd)
      .toString("utf8")
      .split(";")[0]
      .trim();
    const size = Number.parseInt(sizeToken, HEX_RADIX);
    if (!Number.isFinite(size) || size < 0) {
      return null;
    }
    const dataStart = lineEnd + HTTP_LINE_SEPARATOR.length;
    if (size === 0) {
      return Buffer.concat(parts).toString("utf8");
    }
    const dataEnd = dataStart + size;
    if (buffer.length < dataEnd + HTTP_LINE_SEPARATOR.length) {
      return null;
    }
    parts.push(buffer.subarray(dataStart, dataEnd));
    offset = dataEnd + HTTP_LINE_SEPARATOR.length;
  }
}

function parseHeaders(
  headerLines: readonly string[]
): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name) {
      headers[name] = value;
    }
  }
  return headers;
}

function parseBody(bodyText: string): unknown {
  if (!bodyText.trim()) {
    return null;
  }
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
}
