export type ProviderTurnStatus = "idle" | "running" | "stopped";

export interface ProviderTokenUsage {
  cached: number | null;
  limit: number;
  used: number;
}

export interface ProviderUsageLimitBucket {
  percentUsed: number;
  resetsAt?: string | null;
}

export interface ProviderUsageLimitLabels {
  currentSession?: string | null;
  currentWeekAllModels?: string | null;
  currentWeekSonnetOnly?: string | null;
}

export interface ProviderUsageLimits {
  currentSession?: ProviderUsageLimitBucket | null;
  currentWeekAllModels?: ProviderUsageLimitBucket | null;
  currentWeekSonnetOnly?: ProviderUsageLimitBucket | null;
}

export interface ProviderLimitRow {
  label: string;
  percentUsed: number | null;
  resetLabel: string | null;
  state: "loading" | "unavailable" | null;
  text: string;
}

export interface ProviderUsageTelemetry {
  cacheDisplay: {
    title: string;
    value: string;
  } | null;
  limitRows: ProviderLimitRow[];
  model: string;
  provider: string;
  providerId: string;
  providerScopeKey: string | null;
  providerSessionId: string | null;
  status: ProviderTurnStatus;
  tokenDisplay: {
    title: string;
    value: string;
  };
  tokenUsage: ProviderTokenUsage;
  updatedAt: string;
  usageLimitLabels: ProviderUsageLimitLabels;
  usageLimits: ProviderUsageLimits | null;
}

interface CreateTelemetryRequest {
  model: string;
  provider: string;
  providerId: string;
  status?: ProviderTurnStatus;
}

interface ProviderBindingLike {
  error?: string;
  providerSessionId?: string;
  status: "failed" | "pending" | "ready";
}

const DEFAULT_TOKEN_LIMIT = 200_000;
// Token limit for five-hour-window subscription providers (the GLM coding
// plan; the ACP Kimi that first needed it left with the kimi-provider
// retirement, 2026-07-05).
const FIVE_HOUR_WINDOW_TOKEN_LIMIT = 262_144;

export class UsageContextTelemetryFacade {
  createTelemetry(request: CreateTelemetryRequest): ProviderUsageTelemetry {
    const tokenUsage = {
      cached: defaultCachedTokenCount(request.providerId),
      limit: defaultTokenLimit(request.providerId),
      used: 0,
    };
    return buildTelemetry({
      model: request.model,
      provider: request.provider,
      providerId: request.providerId,
      providerSessionId: null,
      status: request.status ?? "idle",
      tokenUsage,
      usageLimits: null,
    });
  }

  applyBinding(
    current: ProviderUsageTelemetry,
    binding: ProviderBindingLike
  ): ProviderUsageTelemetry {
    return buildTelemetry({
      model: current.model,
      provider: current.provider,
      providerId: current.providerId,
      providerSessionId: binding.providerSessionId ?? null,
      status: current.status,
      tokenUsage: current.tokenUsage,
      usageLimitLabels: current.usageLimitLabels,
      usageLimits: current.usageLimits,
    });
  }

  applyStatus(
    current: ProviderUsageTelemetry,
    status: ProviderTurnStatus
  ): ProviderUsageTelemetry {
    return buildTelemetry({
      model: current.model,
      provider: current.provider,
      providerId: current.providerId,
      providerSessionId: current.providerSessionId,
      status,
      tokenUsage: current.tokenUsage,
      usageLimitLabels: current.usageLimitLabels,
      usageLimits: current.usageLimits,
    });
  }

  applyProviderEvent(
    current: ProviderUsageTelemetry,
    event: unknown
  ): ProviderUsageTelemetry {
    const tokenUsage = readTokenUsage(event);
    const usageLimits = readUsageLimits(event);
    if (!(tokenUsage || usageLimits)) {
      return current;
    }
    return buildTelemetry({
      model: current.model,
      provider: current.provider,
      providerId: current.providerId,
      providerSessionId: current.providerSessionId,
      status: current.status,
      tokenUsage: tokenUsage
        ? mergeTokenUsage(current, tokenUsage)
        : current.tokenUsage,
      usageLimitLabels: current.usageLimitLabels,
      usageLimits: usageLimits ?? current.usageLimits,
    });
  }
}

function mergeTokenUsage(
  current: ProviderUsageTelemetry,
  next: ProviderTokenUsage
): ProviderTokenUsage {
  return {
    cached: mergeCachedTokenCount({
      current: current.tokenUsage.cached,
      next: next.cached,
      providerId: current.providerId,
    }),
    limit: next.limit || current.tokenUsage.limit,
    used: next.used,
  };
}

function mergeCachedTokenCount(options: {
  current: number | null;
  next: number | null;
  providerId: string;
}): number | null {
  if (options.next === null) {
    return options.current;
  }
  if (
    isCodexFamilyProvider(options.providerId) &&
    (options.current ?? 0) > 0 &&
    options.next === 0
  ) {
    return options.current;
  }
  return options.next;
}

function buildTelemetry(value: {
  model: string;
  provider: string;
  providerId: string;
  providerSessionId: string | null;
  status: ProviderTurnStatus;
  tokenUsage: ProviderTokenUsage;
  usageLimitLabels?: ProviderUsageLimitLabels;
  usageLimits: ProviderUsageLimits | null;
}): ProviderUsageTelemetry {
  const labels = value.usageLimitLabels ?? fallbackLabels(value.providerId);
  return {
    ...value,
    cacheDisplay: formatCacheUsage(value.tokenUsage),
    limitRows: buildLimitRows({
      labels,
      providerId: value.providerId,
      usageLimits: value.usageLimits,
    }),
    providerScopeKey: providerScopeKey(value.providerId),
    tokenDisplay: formatTokenUsage(value.tokenUsage),
    updatedAt: new Date().toISOString(),
    usageLimitLabels: labels,
  };
}

function buildLimitRows(options: {
  labels: ProviderUsageLimitLabels;
  providerId: string;
  usageLimits: ProviderUsageLimits | null;
}): ProviderLimitRow[] {
  const pendingState = options.usageLimits
    ? null
    : pendingLimitState(options.providerId);
  const rows = [
    limitRow(
      options.labels.currentSession ?? "Session",
      options.usageLimits?.currentSession,
      pendingState
    ),
    limitRow(
      options.labels.currentWeekAllModels ?? "Weekly",
      options.usageLimits?.currentWeekAllModels,
      pendingState
    ),
    limitRow(
      options.labels.currentWeekSonnetOnly ?? "Model Weekly",
      options.usageLimits?.currentWeekSonnetOnly,
      pendingState
    ),
  ];
  return rows.filter((row, index) => index < 2 || row.percentUsed !== null);
}

function limitRow(
  label: string,
  bucket: ProviderUsageLimitBucket | null | undefined,
  state: "loading" | "unavailable" | null
): ProviderLimitRow {
  const percentUsed = bucket?.percentUsed ?? null;
  const resetLabel = bucket?.resetsAt ? buildResetLabel(bucket.resetsAt) : null;
  let labelText = label;
  if (percentUsed !== null) {
    labelText = `${label} ${percentUsed}%`;
  } else if (state) {
    labelText = `${label} ${state === "loading" ? "..." : "unavailable"}`;
  }
  return {
    label,
    percentUsed,
    resetLabel,
    state: percentUsed === null ? state : null,
    text: resetLabel ? `${labelText} (${resetLabel})` : labelText,
  };
}

function readTokenUsage(event: unknown): ProviderTokenUsage | null {
  const root = isRecord(event) ? event : null;
  const data = isRecord(root?.data) ? root.data : null;
  let candidate = isRecord(root?.tokenUsage) ? root.tokenUsage : null;
  if (!candidate && isRecord(data?.tokenUsage)) {
    candidate = data.tokenUsage;
  }
  if (!candidate) {
    return null;
  }
  const used =
    readNumber(candidate.used) ??
    readNumber(candidate.totalTokens) ??
    readNumber(candidate.total_tokens);
  const limit = readNumber(candidate.limit) ?? 0;
  const cached = readCachedTokenCount(candidate);
  if (used === null || used < 0) {
    return null;
  }
  return { cached, used, limit: Math.max(0, limit) };
}

function readUsageLimits(event: unknown): ProviderUsageLimits | null {
  const root = isRecord(event) ? event : null;
  const data = isRecord(root?.data) ? root.data : null;
  let candidate = isRecord(root?.usageLimits) ? root.usageLimits : null;
  if (!candidate && isRecord(data?.usageLimits)) {
    candidate = data.usageLimits;
  }
  if (!candidate) {
    return null;
  }
  const usageLimits = {
    currentSession: readBucket(candidate.currentSession),
    currentWeekAllModels: readBucket(candidate.currentWeekAllModels),
    currentWeekSonnetOnly: readBucket(candidate.currentWeekSonnetOnly),
  };
  return usageLimits.currentSession ||
    usageLimits.currentWeekAllModels ||
    usageLimits.currentWeekSonnetOnly
    ? usageLimits
    : null;
}

function readBucket(value: unknown): ProviderUsageLimitBucket | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }
  const percentUsed = readNumber(value.percentUsed);
  if (percentUsed === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(Math.round(percentUsed)),
    resetsAt: readString(value.resetsAt),
  };
}

function formatTokenUsage(tokenUsage: ProviderTokenUsage): {
  title: string;
  value: string;
} {
  const limit = tokenUsage.limit > 0 ? tokenUsage.limit : null;
  const remaining = limit
    ? clampPercent(100 - Math.round((tokenUsage.used / limit) * 100))
    : 0;
  const usedText = tokenUsage.used.toLocaleString();
  const limitText = limit?.toLocaleString() ?? "unknown";
  return {
    title: `Context window: ${usedText} used, ${limitText} limit, ${remaining}% remaining`,
    value: `${usedText} (${remaining}%)`,
  };
}

function formatCacheUsage(tokenUsage: ProviderTokenUsage): {
  title: string;
  value: string;
} | null {
  if (tokenUsage.cached === null) {
    return null;
  }
  const cachedText = tokenUsage.cached.toLocaleString();
  return {
    title: `Cached input tokens: ${cachedText}`,
    value: cachedText,
  };
}

function readCachedTokenCount(
  candidate: Record<string, unknown>
): number | null {
  const value =
    readNumber(candidate.cached) ??
    readNumber(candidate.cachedTokens) ??
    readNumber(candidate.cached_tokens) ??
    readNumber(candidate.cachedInputTokens) ??
    readNumber(candidate.cached_input_tokens);
  return value === null || value < 0 ? null : value;
}

function fallbackLabels(providerId: string): ProviderUsageLimitLabels {
  return hasFiveHourWindow(providerId)
    ? {
        currentSession: "5h",
        currentWeekAllModels: "Weekly",
        currentWeekSonnetOnly: "Parallel",
      }
    : {
        currentSession: "Session",
        currentWeekAllModels: "Weekly",
        currentWeekSonnetOnly: "Model Weekly",
      };
}

function pendingLimitState(providerId: string): "loading" | "unavailable" {
  if (providerId === "claude" || isCodexFamilyProvider(providerId)) {
    return "loading";
  }
  return "unavailable";
}

function providerScopeKey(providerId: string): string | null {
  // Only the native vendor channels carry a provider-scoped usage limit; the
  // retired glm-native/openrouter/ACP-kimi provider scopes left with the
  // 2026-07-05 cleanups.
  if (providerId === "claude") {
    return "claude:global";
  }
  if (isCodexFamilyProvider(providerId)) {
    return "codex:global";
  }
  return null;
}

function defaultCachedTokenCount(providerId: string): number | null {
  return isCodexFamilyProvider(providerId) ? 0 : null;
}

function defaultTokenLimit(providerId: string): number {
  return hasFiveHourWindow(providerId)
    ? FIVE_HOUR_WINDOW_TOKEN_LIMIT
    : DEFAULT_TOKEN_LIMIT;
}

function hasFiveHourWindow(providerId: string): boolean {
  // The live GLM coding-plan endpoint (`glm-client`) keeps the five-hour
  // window; the ACP `kimi` match left with the kimi-provider retirement.
  return providerId.startsWith("glm-");
}

function isCodexFamilyProvider(providerId: string): boolean {
  return providerId === "codex" || providerId === "codex-uc";
}

function buildResetLabel(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return `Resets ${value.trim()}`;
  }
  const date = new Date(timestamp);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
  }).formatToParts(date);
  const hour24 = Number.parseInt(
    parts.find((part) => part.type === "hour")?.value ?? "0",
    10
  );
  const minute = Number.parseInt(
    parts.find((part) => part.type === "minute")?.value ?? "0",
    10
  );
  const hour12 = hour24 % 12 || 12;
  const meridiem = hour24 >= 12 ? "pm" : "am";
  const clock =
    minute === 0 ? `${hour12}${meridiem}` : `${hour12}:${minute}${meridiem}`;
  return `Resets ${monthDay} at ${clock}`;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/gu, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const usageContextTelemetryFacade = new UsageContextTelemetryFacade();
