// LM Studio management channel (researched 2026-07-05): LM Studio 0.4.0+
// ships a native v1 REST API — GET /api/v1/models lists per-model
// max_context_length + loaded_instances[].config.context_length,
// POST /api/v1/models/load accepts {model, context_length} and
// POST /api/v1/models/unload releases an instance — so Harness can load a
// model with a chosen window remotely. Inference stays on the OpenAI-shape
// /v1/chat/completions (the universal client); this file is the separate
// Core-owned management channel. Ollama/llama.cpp and older LM Studio
// versions degrade to the plain /v1/models id list (detection-only).

const DEFAULT_TIMEOUT_MS = 5000;
const TRAILING_SLASHES_PATTERN = /\/+$/u;
const V1_SUFFIX_PATTERN = /\/v1$/u;

type FetchLike = typeof fetch;

export interface LocalModelEntry {
  readonly displayName: string;
  readonly key: string;
  // Context of the running instance; null when the model is not loaded.
  readonly loadedContextLength: number | null;
  readonly loadedInstanceId: string | null;
  // Model maximum from the catalog; null when the server does not report it.
  readonly maxContextLength: number | null;
  // trained_for_tool_use from LM Studio capabilities; null when unknown.
  readonly supportsTools: boolean | null;
}

export interface LocalModelsRequestInput {
  readonly baseUrl: string;
  readonly fetchImplementation?: FetchLike;
  readonly timeoutMs?: number;
}

const serverRoot = (baseUrl: string): string =>
  baseUrl
    .trim()
    .replace(TRAILING_SLASHES_PATTERN, "")
    .replace(V1_SUFFIX_PATTERN, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const readPositiveInteger = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;

const requestJson = async (
  url: string,
  input: LocalModelsRequestInput,
  init?: RequestInit
): Promise<unknown> => {
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
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

const postJson = (
  url: string,
  body: Record<string, unknown>,
  input: LocalModelsRequestInput
): Promise<unknown> =>
  requestJson(url, input, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

// v1 catalog entry -> LocalModelEntry; embedding models are skipped (the
// session picker lists chat-capable models only).
const entryFromV1 = (value: unknown): LocalModelEntry | null => {
  if (!isRecord(value) || value.type !== "llm") {
    return null;
  }
  const key = readString(value.key);
  if (!key) {
    return null;
  }
  const instances = Array.isArray(value.loaded_instances)
    ? value.loaded_instances.filter(isRecord)
    : [];
  const firstInstance = instances[0];
  const instanceConfig = isRecord(firstInstance?.config)
    ? firstInstance.config
    : null;
  const capabilities = isRecord(value.capabilities) ? value.capabilities : null;
  return {
    displayName: readString(value.display_name) ?? key,
    key,
    loadedContextLength: instanceConfig
      ? readPositiveInteger(instanceConfig.context_length)
      : null,
    loadedInstanceId: firstInstance ? readString(firstInstance.id) : null,
    maxContextLength: readPositiveInteger(value.max_context_length),
    supportsTools:
      capabilities && typeof capabilities.trained_for_tool_use === "boolean"
        ? capabilities.trained_for_tool_use
        : null,
  };
};

// v0 catalog entry (older LM Studio): flat max/loaded context fields.
const entryFromV0 = (value: unknown): LocalModelEntry | null => {
  if (!isRecord(value) || (value.type !== "llm" && value.type !== undefined)) {
    return null;
  }
  const key = readString(value.id);
  if (!key) {
    return null;
  }
  const loaded = readPositiveInteger(value.loaded_context_length);
  return {
    displayName: key,
    key,
    loadedContextLength: loaded,
    loadedInstanceId: loaded ? key : null,
    maxContextLength: readPositiveInteger(value.max_context_length),
    supportsTools: null,
  };
};

// Plain OpenAI /v1/models id (Ollama, llama.cpp, older servers): ids only.
const entryFromPlain = (value: unknown): LocalModelEntry | null => {
  const key = isRecord(value) ? readString(value.id) : null;
  if (!key) {
    return null;
  }
  return {
    displayName: key,
    key,
    loadedContextLength: null,
    loadedInstanceId: null,
    maxContextLength: null,
    supportsTools: null,
  };
};

const listFrom = (
  payload: unknown,
  field: "data" | "models",
  map: (value: unknown) => LocalModelEntry | null
): LocalModelEntry[] | null => {
  if (!(isRecord(payload) && Array.isArray(payload[field]))) {
    return null;
  }
  const entries = payload[field]
    .map(map)
    .filter((entry): entry is LocalModelEntry => entry !== null);
  return entries.length > 0 ? entries : null;
};

// Structured model catalog from the configured server: LM Studio v1 first,
// v0 second, plain /v1/models ids as the provider-agnostic last resort.
export const listLocalModelEntries = async (
  input: LocalModelsRequestInput
): Promise<LocalModelEntry[]> => {
  const root = serverRoot(input.baseUrl);
  if (!root) {
    return [];
  }
  const v1 = await requestJson(`${root}/api/v1/models`, input).catch(
    () => null
  );
  const fromV1 = listFrom(v1, "models", entryFromV1);
  if (fromV1) {
    return fromV1;
  }
  const v0 = await requestJson(`${root}/api/v0/models`, input).catch(
    () => null
  );
  const fromV0 = listFrom(v0, "data", entryFromV0);
  if (fromV0) {
    return fromV0;
  }
  const plain = await requestJson(`${root}/v1/models`, input).catch(() => null);
  return listFrom(plain, "data", entryFromPlain) ?? [];
};

// Load a model with a chosen context window through the LM Studio v1
// management API; resolves with the applied window (echo_load_config) or
// null when the server rejected/ignored the call.
export const loadLocalModel = async (
  input: LocalModelsRequestInput & {
    readonly contextLength?: number;
    readonly model: string;
  }
): Promise<number | null> => {
  const root = serverRoot(input.baseUrl);
  if (!root) {
    return null;
  }
  const contextLength = readPositiveInteger(input.contextLength ?? null);
  const payload = await postJson(
    `${root}/api/v1/models/load`,
    {
      echo_load_config: true,
      model: input.model,
      ...(contextLength ? { context_length: contextLength } : {}),
    },
    input
  ).catch(() => null);
  if (!isRecord(payload)) {
    return null;
  }
  const loadConfig = isRecord(payload.load_config) ? payload.load_config : null;
  return (
    (loadConfig ? readPositiveInteger(loadConfig.context_length) : null) ??
    contextLength
  );
};

export const unloadLocalModel = async (
  input: LocalModelsRequestInput & { readonly instanceId: string }
): Promise<boolean> => {
  const root = serverRoot(input.baseUrl);
  if (!root) {
    return false;
  }
  const payload = await postJson(
    `${root}/api/v1/models/unload`,
    { instance_id: input.instanceId },
    input
  ).catch(() => null);
  return isRecord(payload);
};

// Make the running instance match the desired window (the Harness
// counterpart of the LM Studio load slider): no-op when it already matches
// or when no wish is set; reload (unload + load) when it differs. Resolves
// with the effective window or null when management is unavailable
// (Ollama/llama.cpp, older LM Studio) — callers fall back to detection.
export const ensureLocalModelContext = async (
  input: LocalModelsRequestInput & {
    readonly desiredContextLength: number;
    readonly model: string;
  }
): Promise<number | null> => {
  const desired = readPositiveInteger(input.desiredContextLength);
  if (!desired) {
    return null;
  }
  const entries = await listLocalModelEntries(input);
  const entry = entries.find((candidate) => candidate.key === input.model);
  if (!entry || entry.maxContextLength === null) {
    // Plain-id servers expose no management surface; leave them alone.
    return null;
  }
  if (entry.loadedContextLength === desired) {
    return desired;
  }
  if (entry.loadedInstanceId) {
    await unloadLocalModel({ ...input, instanceId: entry.loadedInstanceId });
  }
  return await loadLocalModel({
    ...input,
    contextLength: desired,
    model: input.model,
  });
};
