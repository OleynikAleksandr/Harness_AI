import type {
  ProviderProfileApplicationDetails,
  ProviderSessionStartOptions,
  SessionProfilePayload,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";

/**
 * Codex profile application layer (docs/architecture/SessionProfiles.md):
 * the managed prompt travels as `baseInstructions` on thread/start and
 * thread/resume (full replacement of the built-in instructions); native
 * omits it so the vendor CLI runs untouched. Tooling categories are not
 * applied — tool availability is fixed by the shared app-server process
 * `--disable` flags, and restarting that shared process per profile would
 * invalidate other sessions' thread bindings. Applied details therefore
 * expose the effective process profile key and the provider-fixed ceiling.
 */
export interface CodexSessionProfileState {
  readonly kind: "managed" | "native";
  readonly payload?: SessionProfilePayload;
}

export function resolveCodexSessionProfileState(
  options?: ProviderSessionStartOptions
): CodexSessionProfileState | undefined {
  if (options?.profileKind === "managed" && options.profile) {
    return { kind: "managed", payload: options.profile };
  }
  if (options?.profileKind === "native") {
    return { kind: "native" };
  }
  return;
}

/** Extra thread/start (and thread/resume) params for the profile state. */
export function buildCodexThreadProfileParams(
  state?: CodexSessionProfileState
): Record<string, unknown> {
  if (state?.kind === "managed" && state.payload) {
    return { baseInstructions: state.payload.prompt };
  }
  return {};
}

export function computeCodexProfileDetails(
  state: CodexSessionProfileState | undefined,
  processProfileKey: string
): ProviderProfileApplicationDetails | undefined {
  if (!state) {
    return;
  }
  if (state.kind === "native" || !state.payload) {
    return {
      mode: "native",
      processProfileKey,
      tooling: "process-flags (no per-thread control)",
    };
  }
  return {
    contentHash: state.payload.contentHash,
    mode: "managed",
    processProfileKey,
    profileId: state.payload.profileId,
    systemPrompt: "baseInstructions full-replacement",
    toolMode: "provider-fixed",
    tooling: "app-server process tools (no per-thread control)",
  };
}
