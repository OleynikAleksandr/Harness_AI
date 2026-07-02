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

// Fire-and-forget provider-side cleanup for a removed session: close the
// bound provider session (if any), then delete provider-owned artifacts.
export function closeAndCleanupProviderSession(options: {
  adapter?:
    | import("../../../../../../provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.js").ProviderAdapter
    | null;
  binding?: import("./session-request-handler-types.js").ProviderRuntimeBinding;
  providerSessionId?: string;
  workspacePath?: string;
}): void {
  options.binding?.unsubscribe();
  (options.binding
    ? options.binding.adapter.closeSession(options.binding.providerSessionId)
    : Promise.resolve()
  )
    .then(() => {
      if (options.workspacePath && options.providerSessionId) {
        return options.adapter?.deleteSessionArtifacts?.(
          options.providerSessionId,
          options.workspacePath
        );
      }
    })
    .catch(() => undefined);
}
