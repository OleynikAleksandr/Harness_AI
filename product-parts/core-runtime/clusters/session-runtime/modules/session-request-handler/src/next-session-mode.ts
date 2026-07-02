export type NextSessionInvocationMode = "managed" | "native";
export type NextSessionRequestMode = "normalized" | "raw";
export type ManagedProfileSelectionMode = "auto" | "user";

export interface NextSessionMode {
  invocationMode: NextSessionInvocationMode;
  managedProfileId?: string;
  managedProfileSelection?: ManagedProfileSelectionMode;
  requestMode: NextSessionRequestMode;
}

export const NATIVE_RAW_SESSION_MODE: NextSessionMode = {
  invocationMode: "native",
  requestMode: "raw",
};

/**
 * Resolves the submitted next-session mode. Managed selection activates only
 * with a concrete profile id; requestMode stays "raw" until the normalizer
 * exists (docs/architecture/SessionProfiles.md). Anything else resolves to
 * the Native · Raw baseline.
 */
export function resolveNextSessionMode(input?: unknown): NextSessionMode {
  if (
    typeof input === "object" &&
    input !== null &&
    (input as Record<string, unknown>).invocationMode === "managed"
  ) {
    const record = input as Record<string, unknown>;
    const managedProfileId =
      typeof record.managedProfileId === "string"
        ? record.managedProfileId.trim()
        : "";
    if (managedProfileId && managedProfileId !== "native") {
      return {
        invocationMode: "managed",
        managedProfileId,
        managedProfileSelection:
          record.managedProfileSelection === "auto" ? "auto" : "user",
        requestMode: "raw",
      };
    }
  }
  return { ...NATIVE_RAW_SESSION_MODE };
}

export function formatNextSessionMode(mode: NextSessionMode): string {
  return `${capitalize(mode.invocationMode)} · ${capitalize(mode.requestMode)}`;
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
