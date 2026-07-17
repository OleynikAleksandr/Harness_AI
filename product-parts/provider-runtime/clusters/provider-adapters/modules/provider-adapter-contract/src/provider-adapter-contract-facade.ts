export interface ProviderTurnOptions {
  [key: string]: unknown;
}

export type ProviderInteractionKind =
  | "permission"
  | "ask_user"
  | "plan_approval";

export interface ProviderInteractionOption {
  readonly description?: string;
  readonly id: string;
  readonly kind?: string;
  readonly label: string;
}

export interface ProviderInteractionQuestion {
  readonly allowFreeform: boolean;
  readonly allowMultiple: boolean;
  readonly header?: string;
  readonly id: string;
  readonly options: readonly ProviderInteractionOption[];
  readonly prompt: string;
}

export interface ProviderInteractionRequestEvent {
  readonly expiresAt?: string;
  readonly interactionId: string;
  readonly kind: ProviderInteractionKind;
  readonly message: string;
  readonly options: readonly ProviderInteractionOption[];
  readonly plan?: string;
  readonly provider: string;
  readonly questions: readonly ProviderInteractionQuestion[];
  readonly timestamp: string;
  readonly title: string;
  readonly toolCallId?: string;
  readonly type: "provider_interaction_requested";
}

export interface ProviderInteractionResolvedEvent {
  readonly interactionId: string;
  readonly provider: string;
  readonly reason: "cancelled" | "provider" | "submitted" | "timed_out";
  readonly timestamp: string;
  readonly type: "provider_interaction_resolved";
}

export interface ProviderInteractionDecision {
  readonly answers?: Readonly<Record<string, string | readonly string[]>>;
  readonly feedback?: string;
  readonly interactionId: string;
  readonly optionId?: string;
  readonly outcome: "answered" | "approved" | "cancelled" | "selected";
}

export function isProviderInteractionRequestEvent(
  value: unknown
): value is ProviderInteractionRequestEvent {
  return (
    isInteractionRecord(value) &&
    value.type === "provider_interaction_requested" &&
    typeof value.interactionId === "string" &&
    (value.kind === "permission" ||
      value.kind === "ask_user" ||
      value.kind === "plan_approval")
  );
}

export function isProviderInteractionResolvedEvent(
  value: unknown
): value is ProviderInteractionResolvedEvent {
  return (
    isInteractionRecord(value) &&
    value.type === "provider_interaction_resolved" &&
    typeof value.interactionId === "string"
  );
}

function isInteractionRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export type ProviderSubagentStatus =
  | "pending"
  | "running"
  | "interrupted"
  | "completed"
  | "failed"
  | "shutdown"
  | "not_found";

export interface ProviderSubagentState {
  readonly message?: string;
  readonly providerSessionId: string;
  readonly status: ProviderSubagentStatus;
}

export interface ProviderSubagentControlEvent {
  readonly action: "spawn" | "send_input" | "resume" | "wait" | "close";
  readonly agentStates: readonly ProviderSubagentState[];
  readonly callId: string;
  readonly lifecycleStatus: "running" | "completed" | "failed";
  readonly model?: string;
  readonly prompt?: string;
  readonly reasoningEffort?: string;
  readonly receiverProviderSessionIds: readonly string[];
  readonly senderProviderSessionId: string;
  readonly timestamp: string;
  readonly type: "subagent_control";
}

export interface ProviderSubagentSessionEvent {
  readonly agentNickname?: string;
  readonly agentRole?: string;
  readonly parentProviderSessionId: string;
  readonly providerSessionId: string;
  // Final result text of a finishing agent, for providers whose subagents
  // have no provider channel of their own (synthesized children): Core
  // publishes it once as the child's assistant message on terminalization.
  readonly result?: string;
  readonly status: ProviderSubagentStatus;
  readonly task?: string;
  readonly timestamp: string;
  readonly title?: string;
  readonly type: "subagent_session";
}

export interface ProviderSubagentStatusEvent {
  readonly providerSessionId: string;
  readonly status: ProviderSubagentStatus;
  readonly timestamp: string;
  readonly type: "subagent_status";
}

export type ProviderSubagentEvent =
  | ProviderSubagentControlEvent
  | ProviderSubagentSessionEvent
  | ProviderSubagentStatusEvent;

export function isProviderSubagentEvent(
  value: unknown
): value is ProviderSubagentEvent {
  if (!(value && typeof value === "object")) {
    return false;
  }
  const type = (value as { readonly type?: unknown }).type;
  return (
    type === "subagent_control" ||
    type === "subagent_session" ||
    type === "subagent_status"
  );
}

// Provider-tagged applied-input-envelope recorded during native request
// capture. Only `kind` is typed at this boundary; each adapter passes its own
// concrete envelope (extra fields serialized as-is by the capture writer).
export interface ProviderNativeCaptureAppliedInputEnvelope {
  // Kimi denotes the diagnostic native-CLI channel only; it does not imply a
  // registered ACP session provider.
  readonly kind: "claude" | "codex" | "kimi";
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
  readonly selectedReasoningEffort?: string | null;
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
  respondToInteraction?(
    sessionId: string,
    decision: ProviderInteractionDecision
  ): Promise<void>;
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
