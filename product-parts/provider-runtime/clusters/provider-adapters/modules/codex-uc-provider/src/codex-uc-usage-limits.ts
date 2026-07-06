export interface CodexUcUsageLimitBucket {
  readonly percentUsed: number;
  readonly resetsAt?: string | null;
}

export interface CodexUcUsageLimits {
  readonly currentSession?: CodexUcUsageLimitBucket | null;
  readonly currentWeekAllModels?: CodexUcUsageLimitBucket | null;
}

export function readUsageLimitsFromHeaders(
  headers: Headers
): CodexUcUsageLimits | null {
  const currentSession = readHeaderBucket(headers, "session");
  const currentWeekAllModels = readHeaderBucket(headers, "weekly");
  return currentSession || currentWeekAllModels
    ? { currentSession, currentWeekAllModels }
    : null;
}

function readHeaderBucket(
  headers: Headers,
  scope: "session" | "weekly"
): CodexUcUsageLimitBucket | null {
  const percentUsed = readHeaderNumber(
    headers,
    `x-codex-${scope}-used-percent`,
    `x-chatgpt-${scope}-used-percent`,
    `x-oai-${scope}-used-percent`
  );
  if (percentUsed !== null) {
    return {
      percentUsed: clampPercent(Math.round(percentUsed)),
      resetsAt: readHeaderValue(
        headers,
        `x-codex-${scope}-resets-at`,
        `x-chatgpt-${scope}-resets-at`,
        `x-oai-${scope}-resets-at`
      ),
    };
  }
  const limit = readHeaderNumber(
    headers,
    `x-codex-${scope}-limit`,
    `x-chatgpt-${scope}-limit`,
    `x-oai-${scope}-limit`
  );
  const remaining = readHeaderNumber(
    headers,
    `x-codex-${scope}-remaining`,
    `x-chatgpt-${scope}-remaining`,
    `x-oai-${scope}-remaining`
  );
  if (!(limit !== null && remaining !== null && limit > 0)) {
    return null;
  }
  return {
    percentUsed: clampPercent(Math.round(((limit - remaining) / limit) * 100)),
    resetsAt: readHeaderValue(
      headers,
      `x-codex-${scope}-reset`,
      `x-chatgpt-${scope}-reset`,
      `x-oai-${scope}-reset`
    ),
  };
}

function readHeaderNumber(headers: Headers, ...names: string[]): number | null {
  const value = readHeaderValue(headers, ...names);
  if (value === null) {
    return null;
  }
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readHeaderValue(headers: Headers, ...names: string[]): string | null {
  for (const name of names) {
    const value = headers.get(name);
    if (value?.trim()) {
      return value.trim();
    }
  }
  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
