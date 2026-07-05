// Context-length detection for local OpenAI-compatible servers. The OpenAI
// /v1/models shape reports no context window, so we probe provider-specific
// endpoints (LM Studio, Ollama, llama.cpp) with the settings override as the
// last word. Architecture doc: UniversalClient.md section 3.7.

const DEFAULT_TIMEOUT_MS = 3000;
const TRAILING_SLASHES_PATTERN = /\/+$/u;
const V1_SUFFIX_PATTERN = /\/v1$/u;

export interface LocalModelsContextLengthInput {
  readonly baseUrl: string;
  // Settings override in tokens; > 0 wins over every probe.
  readonly contextLengthOverride: number;
  readonly fetchImplementation?: typeof fetch;
  readonly model: string;
  readonly timeoutMs?: number;
}

type FetchLike = typeof fetch;

// Probes run against the server ROOT (the /v1 suffix is provider-agnostic
// OpenAI surface; the context endpoints live beside it, not under it).
const serverRoot = (baseUrl: string): string =>
  baseUrl
    .trim()
    .replace(TRAILING_SLASHES_PATTERN, "")
    .replace(V1_SUFFIX_PATTERN, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readPositiveInteger = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;

const fetchJson = async (
  url: string,
  fetchImplementation: FetchLike,
  timeoutMs: number,
  init?: RequestInit
): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(url, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
};

// LM Studio: GET /api/v0/models lists entries with max_context_length and,
// when a model is loaded, loaded_context_length (the actually usable window).
const probeLmStudio = async (
  root: string,
  model: string,
  fetchImplementation: FetchLike,
  timeoutMs: number
): Promise<number | null> => {
  const payload = await fetchJson(
    `${root}/api/v0/models`,
    fetchImplementation,
    timeoutMs
  );
  const entries =
    isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
  const entry = entries.find(
    (candidate) => isRecord(candidate) && candidate.id === model
  );
  if (!isRecord(entry)) {
    return null;
  }
  return (
    readPositiveInteger(entry.loaded_context_length) ??
    readPositiveInteger(entry.max_context_length)
  );
};

// Ollama: POST /api/show returns model_info with a family-prefixed
// "<family>.context_length" key (e.g. "llama.context_length").
const probeOllama = async (
  root: string,
  model: string,
  fetchImplementation: FetchLike,
  timeoutMs: number
): Promise<number | null> => {
  const payload = await fetchJson(
    `${root}/api/show`,
    fetchImplementation,
    timeoutMs,
    {
      body: JSON.stringify({ model }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }
  );
  const modelInfo =
    isRecord(payload) && isRecord(payload.model_info)
      ? payload.model_info
      : null;
  if (!modelInfo) {
    return null;
  }
  for (const [key, value] of Object.entries(modelInfo)) {
    if (key.endsWith(".context_length")) {
      const detected = readPositiveInteger(value);
      if (detected) {
        return detected;
      }
    }
  }
  return null;
};

// llama.cpp server: GET /props exposes default_generation_settings.n_ctx —
// the per-slot context actually allocated by the running server.
const probeLlamaCpp = async (
  root: string,
  _model: string,
  fetchImplementation: FetchLike,
  timeoutMs: number
): Promise<number | null> => {
  const payload = await fetchJson(
    `${root}/props`,
    fetchImplementation,
    timeoutMs
  );
  const generationSettings =
    isRecord(payload) && isRecord(payload.default_generation_settings)
      ? payload.default_generation_settings
      : null;
  return generationSettings
    ? readPositiveInteger(generationSettings.n_ctx)
    : null;
};

const PROBES = [probeLmStudio, probeOllama, probeLlamaCpp];

// Resolve the context window for the selected local model: the settings
// override wins, otherwise the first successful probe; null keeps the
// telemetry default when nothing answers.
export const detectLocalModelsContextLength = async (
  input: LocalModelsContextLengthInput
): Promise<number | null> => {
  if (input.contextLengthOverride > 0) {
    return input.contextLengthOverride;
  }
  const root = serverRoot(input.baseUrl);
  if (!root) {
    return null;
  }
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  for (const probe of PROBES) {
    const detected = await probe(
      root,
      input.model,
      fetchImplementation,
      timeoutMs
    ).catch(() => null);
    if (detected) {
      return detected;
    }
  }
  return null;
};
