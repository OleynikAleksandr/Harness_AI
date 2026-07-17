// Provider-keyed usage-limit tables (labels, pending state, scope keys),
// split from the telemetry facade for the 500-line implementation cap.

export function fallbackLimitLabels(providerId: string): {
  readonly currentSession: string;
  readonly currentWeekAllModels: string;
  readonly currentWeekSonnetOnly: string;
} {
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

export function pendingLimitState(
  providerId: string
): "loading" | "unavailable" {
  if (
    providerId === "claude" ||
    providerId === "codex" ||
    providerId === "grok" ||
    providerId === "kimi-client"
  ) {
    return "loading";
  }
  return "unavailable";
}

export function providerScopeKey(providerId: string): string | null {
  // Only the channels with a provider-scoped usage limit; retired provider
  // scopes left with the 2026-07-05 cleanups.
  if (providerId === "claude") {
    return "claude:global";
  }
  if (providerId === "codex") {
    return "codex:global";
  }
  if (providerId === "grok") {
    return "grok:subscription";
  }
  if (providerId === "kimi-client") {
    // One Kimi Coding Plan subscription serves every Kimi session.
    return "kimi:global";
  }
  return null;
}

function hasFiveHourWindow(providerId: string): boolean {
  // The GLM coding plan (`glm-*`) and the Kimi Coding Plan (300-minute
  // window on `/coding/v1/usages`) carry the five-hour window.
  return providerId.startsWith("glm-") || providerId === "kimi-client";
}
