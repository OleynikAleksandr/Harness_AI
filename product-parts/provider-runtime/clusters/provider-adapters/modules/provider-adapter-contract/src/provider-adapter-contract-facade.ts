export interface ProviderTurnOptions {
  [key: string]: unknown;
}

/**
 * Provider-neutral session profile payload materialized by Core
 * (docs/architecture/SessionProfiles.md). Adapters translate it into their
 * channel form in their own profile application layers; an absent payload
 * means the adapter's current behavior (Native once per-adapter native
 * semantics land). Tooling categories use the provider-neutral vocabulary;
 * adapters map the keys they know and treat unknown keys as no-ops.
 */
export interface SessionProfilePayload {
  readonly contentHash: string;
  readonly inputPrefix?: readonly Readonly<Record<string, unknown>>[];
  readonly profileId: string;
  readonly profileName: string;
  readonly prompt: string;
  readonly requestTemplate?: Readonly<Record<string, unknown>>;
  readonly toolingCategories: Readonly<Record<string, boolean>>;
  readonly tools?: readonly Readonly<Record<string, unknown>>[];
}

export interface ProviderSessionStartOptions {
  readonly profile?: SessionProfilePayload;
  /**
   * Distinguishes an explicit Native selection from a legacy session that
   * predates session profiles: "native" applies the channel's native
   * semantics, "managed" applies the payload, absent kind (legacy) keeps
   * the adapter's pre-profile behavior untouched.
   */
  readonly profileKind?: "managed" | "native";
}

/**
 * Actually-applied provider-specific application details returned to Core
 * for the immutable applied profile snapshot (e.g. Claude tool whitelist,
 * Codex process/tooling profile key, Kimi immutable artifact key/path, GLM
 * tool schema ids). Core cannot derive these itself.
 */
export interface ProviderProfileApplicationDetails {
  readonly [key: string]: unknown;
}

export interface ProviderSessionStartResult {
  readonly appliedProfileApplication?: ProviderProfileApplicationDetails;
  readonly providerSessionId: string;
}

/**
 * Additive result contract: legacy adapters keep returning the provider
 * session id as a plain string; profile-aware adapters return the full
 * result. Core normalizes via normalizeProviderSessionStart.
 */
export type ProviderSessionStartOutcome = string | ProviderSessionStartResult;

export function normalizeProviderSessionStart(
  outcome: ProviderSessionStartOutcome
): ProviderSessionStartResult {
  return typeof outcome === "string" ? { providerSessionId: outcome } : outcome;
}

export interface ProviderUsageLimitsRefreshRequest {
  broadcast: (event: unknown) => void;
  providerSessionId: string;
  runtimeSessionId: string;
  workspacePath: string;
}

export interface ProviderRollbackResult {
  providerSessionId: string;
  turns: number;
}

// Provider-tagged applied-input-envelope recorded during native request
// capture. Only `kind` is typed at this boundary; each adapter passes its own
// concrete envelope (extra fields serialized as-is by the capture writer).
export interface ProviderNativeCaptureAppliedInputEnvelope {
  // Capture serves native vendor channels; the ACP Kimi `kind: "kimi"` envelope left with
  // the kimi-provider module deletion (2026-07-05).
  readonly kind: "claude" | "codex";
}

// Record-only native request capture options (no managed-vs-vanilla
// comparison). The Core capture cluster owns the diagnostic proxy and
// certificates and passes their env; the adapter points its own client at the
// proxy, runs the probe, and lets the proxy capture the vendor-default
// request.
export interface ProviderNativeCaptureOptions {
  readonly captureId: string;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly recordAppliedInputEnvelope?: (
    envelope: unknown
  ) => Promise<void> | void;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

export interface ProviderAdapter {
  // Record-only diagnostic native request capture. Optional: providers
  // without a capture path (GLM Native, Local Models, OpenRouter)
  // leave it unimplemented, and Core treats a missing method as
  // `provider_not_supported`.
  captureNativeRequest?(options: ProviderNativeCaptureOptions): Promise<void>;
  closeSession(sessionId: string): Promise<void>;
  createSession(
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome>;
  // Delete provider-owned artifacts for a removed session (e.g. a rollout log).
  // Optional: providers without per-session files leave it unimplemented.
  deleteSessionArtifacts?(
    providerSessionId: string,
    workspacePath: string
  ): Promise<void> | void;
  // Prepare provider-owned workspace home/auth without starting provider CLI/SDK.
  ensureWorkspaceHome?(workspacePath: string): Promise<void> | void;
  initialize?(): Promise<void>;
  refreshUsageLimits?(
    request: ProviderUsageLimitsRefreshRequest
  ): Promise<void> | void;
  resumeSession?(
    sessionId: string,
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome>;
  rollbackSessionTurns?(
    sessionId: string,
    numTurns: number
  ): Promise<ProviderRollbackResult>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: ProviderTurnOptions
  ): Promise<void>;
  subscribe(sessionId: string, listener: ProviderEventListener): () => void;
}

export type ProviderEventListener = (event: unknown) => void;

export class ProviderAdapterContractFacade {
  isProviderAdapter(value: unknown): value is ProviderAdapter {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as Partial<Record<keyof ProviderAdapter, unknown>>;
    return (
      typeof candidate.closeSession === "function" &&
      typeof candidate.createSession === "function" &&
      typeof candidate.sendMessage === "function" &&
      typeof candidate.subscribe === "function"
    );
  }
}

export const providerAdapterContractFacade =
  new ProviderAdapterContractFacade();
