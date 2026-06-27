const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const LATENCY_MARKER = "__HARNESS_OPENROUTER_LATENCY_MARKER__";
const TRAILING_SLASHES_REGEX = /\/+$/u;

export interface OpenRouterEndpointLatencyOptions {
  apiKey?: string;
  baseUrl?: string;
  endpointTag: string;
  fetchImplementation?: typeof fetch;
  model: string;
}

export interface OpenRouterEndpointLatencyResult {
  endpointTag: string;
  error: null | string;
  latencyMs: null | number;
  markerPreserved: boolean;
  ok: boolean;
}

export async function testOpenRouterEndpointLatency({
  apiKey,
  baseUrl,
  endpointTag,
  fetchImplementation = fetch,
  model,
}: OpenRouterEndpointLatencyOptions): Promise<OpenRouterEndpointLatencyResult> {
  const runProbe = async (
    disableReasoning: boolean
  ): Promise<OpenRouterEndpointLatencyResult> => {
    const startedAt = now();
    const response = await fetchImplementation(
      `${normalizeBaseUrl(baseUrl)}/chat/completions`,
      {
        body: JSON.stringify(
          createLatencyRequestBody({ endpointTag, model }, disableReasoning)
        ),
        headers: createHeaders(apiKey),
        method: "POST",
      }
    );
    const latencyMs = Math.round(now() - startedAt);
    const payload = await readResponseJson(response);
    const content = readContent(payload);
    const error = readError(payload);
    return {
      endpointTag,
      error: response.ok ? null : error || `HTTP ${response.status}`,
      latencyMs,
      markerPreserved: content.includes(LATENCY_MARKER),
      ok: response.ok,
    };
  };

  try {
    const result = await runProbe(true);
    return isMandatoryReasoningError(result.error)
      ? await runProbe(false)
      : result;
  } catch (error) {
    return {
      endpointTag,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: null,
      markerPreserved: false,
      ok: false,
    };
  }
}

function createLatencyRequestBody(
  {
    endpointTag,
    model,
  }: {
    endpointTag: string;
    model: string;
  },
  disableReasoning: boolean
): Record<string, unknown> {
  return {
    max_tokens: 32,
    messages: [
      {
        content:
          "Translate to Spanish. Preserve the marker exactly. Return only translated text.",
        role: "system",
      },
      { content: `Latency check ${LATENCY_MARKER}`, role: "user" },
    ],
    model,
    provider: {
      allow_fallbacks: false,
      order: [endpointTag],
    },
    ...(disableReasoning
      ? {
          reasoning: { enabled: false, exclude: true },
          reasoning_effort: "none",
        }
      : {}),
    temperature: 0,
  };
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (readString(baseUrl) || DEFAULT_OPENROUTER_BASE_URL).replace(
    TRAILING_SLASHES_REGEX,
    ""
  );
}

function createHeaders(apiKey: string | undefined): HeadersInit {
  const token = readString(apiKey);
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
    "X-Title": "Harness AI Settings",
  };
}

function isMandatoryReasoningError(error: null | string): boolean {
  const normalized = error?.toLowerCase() ?? "";
  return (
    normalized.includes("reasoning") &&
    (normalized.includes("mandatory") ||
      normalized.includes("cannot be disabled"))
  );
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readContent(payload: unknown): string {
  if (!(isRecord(payload) && Array.isArray(payload.choices))) {
    return "";
  }
  const firstChoice = payload.choices[0];
  if (!(isRecord(firstChoice) && isRecord(firstChoice.message))) {
    return "";
  }
  return readString(firstChoice.message.content);
}

function readError(payload: unknown): string {
  if (!(isRecord(payload) && isRecord(payload.error))) {
    return "";
  }
  return readString(payload.error.message);
}

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
