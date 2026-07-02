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
  readonly recordAppliedInputEnvelope?: (envelope: {
    readonly kind: "kimi";
    readonly providerHomePath: string | null;
    readonly selectedModelId: string | null;
    readonly userConfigPath: string | null;
    readonly wireJsonlPath: string | null;
  }) => Promise<void> | void;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly scenarioId?: string | null;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}
