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
  readonly profileId: string;
  readonly profileName: string;
  readonly prompt: string;
  readonly toolingCategories: Readonly<Record<string, boolean>>;
}

export interface ProviderSessionStartOptions {
  readonly profile?: SessionProfilePayload;
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

export interface ProviderAdapter {
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
