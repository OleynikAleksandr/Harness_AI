// Kimi adapter option/event shapes, split out of kimi-provider-adapter.ts
// to keep it under the 500-line implementation cap.

export type SessionListener = (payload: KimiSessionEvent) => void;

export interface ModuleReporter {
  readonly error?: (
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export interface KimiWorkspaceOptions {
  readonly configPath?: string;
  readonly defaultModel?: string;
  readonly providerHomePath?: string;
  readonly thinkingEnabled?: boolean;
  readonly workspacePath?: string;
}

export interface KimiModuleOptions {
  readonly reporter?: ModuleReporter;
  readonly workspace: KimiWorkspaceOptions;
}

export interface KimiSessionEvent {
  readonly payload?: unknown;
  readonly postTurnTokenUsageUnavailable?: true;
  readonly type: string;
}
export interface KimiNativeRequestCaptureOptions {
  readonly captureId: string;
  // Reverse-bridge and certificate fields from the shared capture contract.
  // Kimi uses only `proxyUrl` (the reverse bridge base URL its base_url is
  // pointed at); the certificate fields are empty (no diagnostic CA).
  readonly certificateEnv?: Readonly<Record<string, string>>;
  readonly certificatePath?: string;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly recordAppliedInputEnvelope?: (envelope: {
    readonly bridgeUrl: string;
    readonly kind: "kimi";
    readonly mode: "acp_default_agent";
    readonly selectedModelId: string | null;
    readonly sourceConfigDir: string | null;
  }) => Promise<void> | void;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}
