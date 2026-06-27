import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const KIMI_CONFIG_PATH = path.join(homedir(), ".kimi-code", "config.toml");
const KIMI_USAGE_ENDPOINT = "https://api.kimi.com/coding/v1/usages";
const GLM_MONITOR_PATH = "/api/monitor/usage/quota/limit";
const CLAUDE_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_OAUTH_SERVICE = "Claude Code-credentials";
const CLAUDE_CREDENTIALS_FILE = path.join(
  homedir(),
  ".claude",
  ".credentials.json"
);
const API_KEY_PATTERN = /^api_key\s*=\s*(.+)$/u;
const COMMENT_PATTERN = /#.*$/u;
const DIGITS_PATTERN = /^\d+$/u;
const SECTION_PATTERN = /^\[([^\]]+)\]$/u;
const TOML_LINE_PATTERN = /\r?\n/u;
const WHITESPACE_PATTERN = /\s/u;

export interface ProviderUsageLimitBucket {
  percentUsed: number;
  resetsAt: string | null;
}

export interface ProviderUsageLimitsValue {
  currentSession: ProviderUsageLimitBucket | null;
  currentWeekAllModels: ProviderUsageLimitBucket | null;
  currentWeekSonnetOnly?: ProviderUsageLimitBucket | null;
}

export function usageLimitsEvent(input: {
  labels?: {
    currentSession?: string;
    currentWeekAllModels?: string;
    currentWeekSonnetOnly?: string;
  };
  providerScopeKey: string;
  source: string;
  usageLimits: ProviderUsageLimitsValue;
}): unknown {
  return {
    data: {
      collectedAt: new Date().toISOString(),
      kind: "usage_limits",
      providerScopeKey: input.providerScopeKey,
      source: input.source,
      ...(input.labels ? { usageLimitLabels: input.labels } : {}),
      usageLimits: input.usageLimits,
    },
    providerScopeKey: input.providerScopeKey,
    timestamp: new Date().toISOString(),
    type: "stream_event",
    usageLimits: input.usageLimits,
    uuid: `${globalThis.crypto.randomUUID()}::usage_limits`,
  };
}

export async function readKimiUsageLimits(): Promise<unknown | null> {
  const apiKey = extractKimiApiKey(
    await readFile(KIMI_CONFIG_PATH, "utf8").catch(() => "")
  );
  if (!apiKey) {
    return null;
  }
  const response = await fetch(KIMI_USAGE_ENDPOINT, {
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
    method: "GET",
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const body = await response.json().catch(() => null);
  if (!isRecord(body)) {
    return null;
  }
  const currentSession = kimiBucket(readFirstLimitDetail(body));
  const currentWeekAllModels = kimiBucket(
    isRecord(body.usage) ? body.usage : null
  );
  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }
  return usageLimitsEvent({
    labels: { currentSession: "5h", currentWeekAllModels: "Weekly" },
    providerScopeKey: "kimi:global",
    source: "kimi_usage_api",
    usageLimits: {
      currentSession,
      currentWeekAllModels,
      currentWeekSonnetOnly: null,
    },
  });
}

export async function readGlmUsageLimits(input: {
  apiKey: string | null;
  baseUrl: string;
}): Promise<unknown | null> {
  const monitorUrl = monitorUrlFromBase(input.baseUrl);
  if (!(input.apiKey && monitorUrl)) {
    return null;
  }
  const response = await fetch(monitorUrl, {
    headers: { Authorization: input.apiKey },
    method: "GET",
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const body = await response.json().catch(() => null);
  const data = isRecord(body) ? body.data : null;
  const limits =
    isRecord(data) && Array.isArray(data.limits) ? data.limits : [];
  const tokenLimits = limits.filter(
    (limit): limit is Record<string, unknown> =>
      isRecord(limit) && limit.type === "TOKENS_LIMIT"
  );
  const buckets = classifyGlmBuckets(tokenLimits);
  const currentSession = glmBucket(buckets.session);
  const currentWeekAllModels = glmBucket(buckets.weekly);
  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }
  return usageLimitsEvent({
    labels: { currentSession: "5h", currentWeekAllModels: "Weekly" },
    providerScopeKey: "glm-native:global",
    source: "glm_monitor",
    usageLimits: {
      currentSession,
      currentWeekAllModels,
      currentWeekSonnetOnly: null,
    },
  });
}

export async function readClaudeUsageLimits(): Promise<unknown | null> {
  const token = await resolveClaudeToken();
  if (!token) {
    return null;
  }
  const response = await fetch(CLAUDE_MESSAGES_URL, {
    body: JSON.stringify({
      max_tokens: 1,
      messages: [{ content: ".", role: "user" }],
      model: "claude-haiku-4-5-20251001",
    }),
    headers: {
      "anthropic-beta": "oauth-2025-04-20",
      "anthropic-version": "2023-06-01",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    method: "POST",
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const currentSession = claudeBucket(response.headers, "5h");
  const currentWeekAllModels = claudeBucket(response.headers, "7d");
  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }
  return usageLimitsEvent({
    labels: { currentSession: "Session", currentWeekAllModels: "Weekly" },
    providerScopeKey: "claude:global",
    source: "claude_probe",
    usageLimits: {
      currentSession,
      currentWeekAllModels,
      currentWeekSonnetOnly: null,
    },
  });
}

export function readCodexUsageLimits(value: unknown): unknown | null {
  const snapshot = isRecord(value) ? value : null;
  const currentSession = codexBucket(snapshot?.primary);
  const currentWeekAllModels = codexBucket(snapshot?.secondary);
  if (!(currentSession || currentWeekAllModels)) {
    return null;
  }
  return usageLimitsEvent({
    providerScopeKey: "codex:global",
    source: "codex_app_server",
    usageLimits: {
      currentSession,
      currentWeekAllModels,
      currentWeekSonnetOnly: null,
    },
  });
}

function extractKimiApiKey(toml: string): string | null {
  let activeSection = "";
  for (const rawLine of toml.split(TOML_LINE_PATTERN)) {
    const line = rawLine.replace(COMMENT_PATTERN, "").trim();
    const section = line.match(SECTION_PATTERN)?.[1]?.trim();
    if (section) {
      activeSection = section;
      continue;
    }
    if (activeSection !== "providers.kimi-for-coding") {
      continue;
    }
    const value = line.match(API_KEY_PATTERN)?.[1];
    if (value) {
      return unquote(value).trim() || null;
    }
  }
  return null;
}

function readFirstLimitDetail(
  value: Record<string, unknown>
): Record<string, unknown> | null {
  const limits = Array.isArray(value.limits) ? value.limits : [];
  const first = limits.find(isRecord);
  return isRecord(first?.detail) ? first.detail : null;
}

function kimiBucket(
  value: Record<string, unknown> | null
): ProviderUsageLimitBucket | null {
  if (!value) {
    return null;
  }
  const limit = readNumber(value.limit);
  const remaining = readNumber(value.remaining);
  const used =
    readNumber(value.used) ??
    (limit !== null && remaining !== null ? limit - remaining : null);
  if (used === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(limit && limit > 0 ? (used / limit) * 100 : used),
    resetsAt: normalizeDate(value.resetTime),
  };
}

function monitorUrlFromBase(baseUrl: string): string | null {
  try {
    return `${new URL(baseUrl).origin}${GLM_MONITOR_PATH}`;
  } catch {
    return null;
  }
}

function classifyGlmBuckets(limits: Record<string, unknown>[]): {
  session: Record<string, unknown> | null;
  weekly: Record<string, unknown> | null;
} {
  const session = limits.find((limit) => readNumber(limit.unit) === 3) ?? null;
  const weekly = limits.find((limit) => readNumber(limit.unit) === 6) ?? null;
  if (session || weekly) {
    return { session, weekly };
  }
  const sorted = [...limits].sort(
    (left, right) =>
      (readNumber(left.nextResetTime) ?? 0) -
      (readNumber(right.nextResetTime) ?? 0)
  );
  return { session: sorted[0] ?? null, weekly: sorted.at(-1) ?? null };
}

function glmBucket(
  value: Record<string, unknown> | null
): ProviderUsageLimitBucket | null {
  const percentUsed = readNumber(value?.percentage);
  if (percentUsed === null) {
    return null;
  }
  const resetMs = readNumber(value?.nextResetTime);
  return {
    percentUsed: clampPercent(percentUsed),
    resetsAt: resetMs === null ? null : new Date(resetMs).toISOString(),
  };
}

function claudeBucket(
  headers: Headers,
  window: "5h" | "7d"
): ProviderUsageLimitBucket | null {
  const prefix = `anthropic-ratelimit-unified-${window}-`;
  const limit = readNumber(
    readHeader(headers, `${prefix}limit`, `${prefix}tokens-limit`)
  );
  const remaining = readNumber(
    readHeader(headers, `${prefix}remaining`, `${prefix}tokens-remaining`)
  );
  const utilization = readNumber(
    readHeader(headers, `${prefix}utilization`, `${prefix}tokens-utilization`)
  );
  if (limit !== null && remaining !== null && limit > 0) {
    return {
      percentUsed: clampPercent(((limit - remaining) / limit) * 100),
      resetsAt: normalizeDate(
        readHeader(headers, `${prefix}reset`, `${prefix}tokens-reset`)
      ),
    };
  }
  if (utilization === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(
      utilization <= 1 ? utilization * 100 : utilization
    ),
    resetsAt: normalizeDate(
      readHeader(headers, `${prefix}reset`, `${prefix}tokens-reset`)
    ),
  };
}

function codexBucket(value: unknown): ProviderUsageLimitBucket | null {
  if (!isRecord(value)) {
    return null;
  }
  const percentUsed = readNumber(value.usedPercent);
  if (percentUsed === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(percentUsed),
    resetsAt: normalizeDate(value.resetsAt),
  };
}

async function resolveClaudeToken(): Promise<string | null> {
  const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  if (envToken) {
    return envToken;
  }
  const fileToken = extractToken(
    await readFile(CLAUDE_CREDENTIALS_FILE, "utf8").catch(() => "")
  );
  if (fileToken) {
    return fileToken;
  }
  if (process.platform !== "darwin") {
    return null;
  }
  const { stdout } = await execFileAsync(
    "/usr/bin/security",
    ["find-generic-password", "-s", CLAUDE_OAUTH_SERVICE, "-w"],
    { timeout: 10_000 }
  ).catch(() => ({ stdout: "" }));
  return extractToken(stdout);
}

function extractToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return findToken(JSON.parse(trimmed) as unknown);
  } catch {
    return trimmed.length >= 24 && !WHITESPACE_PATTERN.test(trimmed)
      ? trimmed
      : null;
  }
}

function findToken(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  for (const key of [
    "accessToken",
    "access_token",
    "oauthToken",
    "oauth_token",
    "token",
  ]) {
    const token = value[key];
    if (typeof token === "string" && token.trim()) {
      return token.trim();
    }
  }
  for (const nested of Object.values(value)) {
    const token = findToken(nested);
    if (token) {
      return token;
    }
  }
  return null;
}

function readHeader(headers: Headers, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = headers.get(key);
    if (value?.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(
      value >= 1_000_000_000_000 ? value : value * 1000
    ).toISOString();
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (DIGITS_PATTERN.test(trimmed)) {
    return normalizeDate(Number.parseInt(trimmed, 10));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

function unquote(value: string): string {
  const trimmed = value.trim();
  return trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ? trimmed.slice(1, -1)
    : trimmed;
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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
