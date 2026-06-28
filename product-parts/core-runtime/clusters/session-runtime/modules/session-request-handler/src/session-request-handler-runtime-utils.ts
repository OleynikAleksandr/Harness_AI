export const ADAPTER_NOT_REGISTERED =
  "Provider adapter is not registered in Core runtime.";
export const PROVIDER_STARTING = "Provider session is still starting.";

export function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export function resolveBindingUnavailableMessage(
  binding: { readonly error?: string; readonly status: string } | null
): string {
  if (binding?.status === "pending") {
    return PROVIDER_STARTING;
  }
  return binding?.error ?? ADAPTER_NOT_REGISTERED;
}

export function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
