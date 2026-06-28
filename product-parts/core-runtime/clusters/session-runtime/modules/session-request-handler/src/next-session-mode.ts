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

export function resolveNextSessionMode(_input?: unknown): NextSessionMode {
  return { ...NATIVE_RAW_SESSION_MODE };
}

export function formatNextSessionMode(mode: NextSessionMode): string {
  return `${capitalize(mode.invocationMode)} · ${capitalize(mode.requestMode)}`;
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
