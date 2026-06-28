import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ClaudeUsageLimitsStreamPayload } from "./reference/index.js";

const execFileAsync = promisify(execFile);
const CLAUDE_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_OAUTH_SERVICE = "Claude Code-credentials";
const CLAUDE_CREDENTIALS_FILE = path.join(
  homedir(),
  ".claude",
  ".credentials.json"
);
const DIGITS_PATTERN = /^\d+$/u;
const WHITESPACE_PATTERN = /\s/u;

type ClaudeUsageLimitBucket = NonNullable<
  NonNullable<ClaudeUsageLimitsStreamPayload["usageLimits"]>["currentSession"]
>;

export async function readClaudeUsageLimitsPayload(): Promise<ClaudeUsageLimitsStreamPayload | null> {
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
  const usageLimits = {
    currentSession,
    currentWeekAllModels,
    currentWeekSonnetOnly: null,
  };
  return {
    data: {
      collectedAt: new Date().toISOString(),
      kind: "usage_limits",
      providerScopeKey: "claude:global",
      source: "claude_probe",
      usageLimits,
    },
    providerScopeKey: "claude:global",
    usageLimits,
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

function claudeBucket(
  headers: Headers,
  window: "5h" | "7d"
): ClaudeUsageLimitBucket | null {
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
  const resetsAt = normalizeDate(
    readHeader(headers, `${prefix}reset`, `${prefix}tokens-reset`)
  );
  if (limit !== null && remaining !== null && limit > 0) {
    return {
      percentUsed: clampPercent(((limit - remaining) / limit) * 100),
      resetsAt,
    };
  }
  if (utilization === null) {
    return null;
  }
  return {
    percentUsed: clampPercent(
      utilization <= 1 ? utilization * 100 : utilization
    ),
    resetsAt,
  };
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
