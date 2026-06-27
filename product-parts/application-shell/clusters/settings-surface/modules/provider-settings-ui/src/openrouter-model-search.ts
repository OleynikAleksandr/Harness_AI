const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_SEARCH_LIMIT = 20;
const TRAILING_SLASHES_REGEX = /\/+$/u;

export interface OpenRouterModelSearchResult {
  canonicalSlug: null | string;
  contextLength: null | number;
  description: string;
  id: string;
  name: string;
}

export interface OpenRouterEndpointResult {
  label: string;
  latencyLast30m: null | number;
  name: string;
  providerName: string;
  tag: string;
  throughputLast30m: null | number;
  uptimeLast30m: null | number;
}

interface OpenRouterRequestOptions {
  apiKey?: string;
  baseUrl?: string;
}

export async function searchOpenRouterModels({
  apiKey,
  baseUrl,
  query,
}: OpenRouterRequestOptions & {
  query: string;
}): Promise<OpenRouterModelSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/models?${new URLSearchParams({
      output_modalities: "text",
      q: trimmedQuery,
    })}`,
    { headers: createHeaders(apiKey) }
  );
  const data = await readPayloadData(response, "OpenRouter model search");
  const models = Array.isArray(data)
    ? data.flatMap((item) => mapModel(item) ?? [])
    : [];
  return rankModels(models, trimmedQuery);
}

export async function loadOpenRouterModelEndpoints({
  apiKey,
  baseUrl,
  modelId,
}: OpenRouterRequestOptions & {
  modelId: string;
}): Promise<OpenRouterEndpointResult[]> {
  const [author, slug] = splitModelId(modelId);
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`,
    { headers: createHeaders(apiKey) }
  );
  const data = await readPayloadData(response, "OpenRouter endpoint lookup");
  const endpoints = isRecord(data) ? data.endpoints : null;
  return Array.isArray(endpoints)
    ? endpoints.flatMap((item) => mapEndpoint(item) ?? [])
    : [];
}

function rankModels(
  models: readonly OpenRouterModelSearchResult[],
  query: string
): OpenRouterModelSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  return models
    .filter((model) =>
      [model.id, model.name, model.canonicalSlug ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    )
    .sort((left, right) => {
      const leftExact =
        left.id.toLowerCase() === normalizedQuery ||
        left.canonicalSlug?.toLowerCase() === normalizedQuery;
      const rightExact =
        right.id.toLowerCase() === normalizedQuery ||
        right.canonicalSlug?.toLowerCase() === normalizedQuery;
      return Number(rightExact) - Number(leftExact);
    })
    .slice(0, DEFAULT_SEARCH_LIMIT);
}

function mapModel(value: unknown): null | OpenRouterModelSearchResult {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  if (!id) {
    return null;
  }
  return {
    canonicalSlug: readString(value.canonical_slug) || null,
    contextLength: readNumber(value.context_length),
    description: readString(value.description),
    id,
    name: readString(value.name) || id,
  };
}

function mapEndpoint(value: unknown): null | OpenRouterEndpointResult {
  if (!isRecord(value)) {
    return null;
  }
  const tag = readString(value.tag);
  if (!tag) {
    return null;
  }
  const providerName = readString(value.provider_name) || tag;
  return {
    label: `${providerName} - ${tag}`,
    latencyLast30m: readNumber(value.latency_last_30m),
    name: readString(value.name) || tag,
    providerName,
    throughputLast30m: readNumber(value.throughput_last_30m),
    uptimeLast30m: readNumber(value.uptime_last_30m),
    tag,
  };
}

async function readPayloadData(response: Response, context: string) {
  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}`);
  }
  const payload: unknown = await response.json();
  return isRecord(payload) ? payload.data : null;
}

function splitModelId(modelId: string): [string, string] {
  const trimmed = modelId.trim();
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0 || slashIndex === trimmed.length - 1) {
    throw new Error("OpenRouter model id must use author/slug format.");
  }
  return [trimmed.slice(0, slashIndex), trimmed.slice(slashIndex + 1)];
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (readString(baseUrl) || DEFAULT_OPENROUTER_BASE_URL).replace(
    TRAILING_SLASHES_REGEX,
    ""
  );
}

function createHeaders(apiKey: string | undefined): HeadersInit {
  const token = readString(apiKey);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): null | number {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
