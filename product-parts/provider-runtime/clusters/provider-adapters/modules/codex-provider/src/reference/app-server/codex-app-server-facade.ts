import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  ProviderSessionStartOptions,
  ProviderSessionStartOutcome,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import { CodexSessionStaleBindingError } from "../provider/codex-session-stale-binding-error.js";
import {
  CODEX_APPLIED_TURN_CONFIG_KEY,
  CODEX_MODEL_SWITCH_INJECTION_KEY,
  type CodexModuleOptions,
  type CodexReasoningSummaryMode,
  type CodexTurnOptions,
  type CodexUsageLimitsStreamPayload,
} from "../types.js";
import {
  type AppServerSessionState,
  CodexAppServerEventRouter,
} from "./codex-app-server-event-router.js";
import {
  buildCodexThreadProfileParams,
  computeCodexProfileDetails,
  resolveCodexSessionProfileState,
} from "./codex-profile-application.js";
import { buildCodexReasoningSummaryParams } from "./codex-reasoning-summary-params.js";
import { CodexSubagentHistoryLoader } from "./codex-subagent-history-loader.js";
import { CodexAppServerProcess } from "./process/codex-app-server-process.js";
import { CODEX_DEFAULT_PROCESS_PROFILE_KEY } from "./process/codex-app-server-process-profile.js";

const DEFAULT_REASONING_SUMMARY: CodexReasoningSummaryMode = "detailed";
const CODEX_WORKFLOW_DEFAULT_APPROVAL_POLICY = "never";
const CODEX_WORKFLOW_DEFAULT_SANDBOX = "danger-full-access";
const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const REASONING_SUMMARY_SETTINGS_CACHE_TTL_MS = 500;

interface ReasoningSummarySettingsCacheEntry {
  readonly enabled: boolean;
  readonly expiresAtMs: number;
  readonly settingsPath: string;
}

export interface CodexRollbackResult {
  readonly providerSessionId: string;
  readonly turns: number;
}

let reasoningSummarySettingsCache: ReasoningSummarySettingsCacheEntry | null =
  null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const buildModelSwitchInputItem = (
  turnOptions: CodexTurnOptions | undefined
): {
  readonly text: string;
  readonly text_elements: [];
  readonly type: "text";
} | null => {
  const payload = turnOptions?.[CODEX_MODEL_SWITCH_INJECTION_KEY];
  if (!isRecord(payload) || payload.kind !== "model_switch") {
    return null;
  }
  const baseInstructions = asString(payload.baseInstructions);
  if (!baseInstructions) {
    return null;
  }
  return {
    type: "text",
    text: [
      "<model_switch>",
      "The user was previously using a different model. Please continue the conversation according to the following instructions:",
      baseInstructions,
      "</model_switch>",
    ].join("\n"),
    text_elements: [],
  };
};

const resolveSettingsPath = (): string | null =>
  asString(process.env.CODEX_SETTINGS_PATH) ??
  asString(process.env.CLAUDE_SETTINGS_PATH);

const readReasoningSummaryEnabled = (settingsPath: string): boolean => {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as unknown;
    if (!(isRecord(parsed) && isRecord(parsed.providers))) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }
    const codex = parsed.providers.codex;
    if (!isRecord(codex)) {
      return DEFAULT_REASONING_SUMMARY_ENABLED;
    }
    if (typeof codex.reasoningSummaryEnabled === "boolean") {
      return codex.reasoningSummaryEnabled;
    }
    if (typeof codex.thinkingDisplaySyncEnabled === "boolean") {
      return codex.thinkingDisplaySyncEnabled;
    }
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  } catch {
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  }
};

const resolveReasoningSummaryEnabled = (): boolean => {
  const settingsPathValue = resolveSettingsPath();
  if (!settingsPathValue) {
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  }
  const settingsPath = path.resolve(settingsPathValue);
  const nowMs = Date.now();
  if (
    reasoningSummarySettingsCache?.settingsPath === settingsPath &&
    reasoningSummarySettingsCache.expiresAtMs > nowMs
  ) {
    return reasoningSummarySettingsCache.enabled;
  }

  const enabled = readReasoningSummaryEnabled(settingsPath);
  reasoningSummarySettingsCache = {
    enabled,
    expiresAtMs: nowMs + REASONING_SUMMARY_SETTINGS_CACHE_TTL_MS,
    settingsPath,
  };
  return enabled;
};

const resolveTurnReasoningSummaryMode = (): CodexReasoningSummaryMode =>
  resolveReasoningSummaryEnabled() ? DEFAULT_REASONING_SUMMARY : "none";

export class CodexAppServerFacade {
  private readonly eventRouter: CodexAppServerEventRouter;
  private readonly historyLoader: CodexSubagentHistoryLoader;
  private readonly process: CodexAppServerProcess;
  private readonly reporter: CodexModuleOptions["reporter"];
  private readonly sessions = new Map<string, AppServerSessionState>();
  // Thread ids for which this facade has actually completed a handshake
  // (thread/start or thread/resume) against the current app-server child
  // process. After Core restart the app-server child dies with us, so a
  // paper-binding resolved by the continuity materializer can point at a
  // thread id that the facade state map is willing to ensureSessionState
  // for (subscribe/listener wiring), but that the app-server itself has
  // never seen. sendMessage consults this set to decide whether to raise
  // CodexSessionStaleBindingError so the Core dispatch layer can run its
  // one-shot invalidate + ensureSessionReadyForSend + resend recovery.
  private readonly handshakedThreadIds = new Set<string>();
  private readonly workspace: CodexModuleOptions["workspace"];

  constructor(options: CodexModuleOptions) {
    this.workspace = options.workspace;
    this.reporter = options.reporter;
    this.process = new CodexAppServerProcess({
      environment: options.environment ?? {},
      processProfileKey: CODEX_DEFAULT_PROCESS_PROFILE_KEY,
      reporter: options.reporter,
    });
    this.eventRouter = new CodexAppServerEventRouter({
      emit: (threadId, payload) => this.emit(threadId, payload),
      ensureSessionState: (threadId) => this.ensureSessionState(threadId),
      listThreadIds: () => this.sessions.keys(),
    });
    this.historyLoader = new CodexSubagentHistoryLoader({
      request: (method, params) => this.process.request(method, params),
      routeNotification: (method, params) =>
        this.eventRouter.handleNotification(method, params),
    });
    this.process.onNotification((notification) => {
      this.eventRouter.handleNotification(
        notification.method,
        notification.params
      );
    });
  }

  async initialize(): Promise<void> {
    await this.process.start();
  }

  async createSession(
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    const profileState = resolveCodexSessionProfileState(startOptions);
    const response = await this.process.request<Record<string, unknown>>(
      "thread/start",
      {
        cwd: workspacePath ?? this.workspace.workspacePath,
        approvalPolicy:
          this.workspace.defaultApprovalMode ??
          CODEX_WORKFLOW_DEFAULT_APPROVAL_POLICY,
        sandbox:
          this.workspace.defaultSandboxMode ?? CODEX_WORKFLOW_DEFAULT_SANDBOX,
        model: this.workspace.defaultModel,
        persistExtendedHistory: false,
        ...buildCodexThreadProfileParams(profileState),
      }
    );
    const thread = isRecord(response.thread) ? response.thread : null;
    const threadId = asString(thread?.id);
    if (!threadId) {
      throw new Error("codex app-server thread/start returned no thread id");
    }
    this.ensureSessionState(threadId, workspacePath);
    this.handshakedThreadIds.add(threadId);
    this.eventRouter.emitRuntimeModel(threadId, response.model);
    this.eventRouter.emitCachedUsageLimits(threadId);
    if (!profileState) {
      return threadId;
    }
    return {
      appliedProfileApplication: computeCodexProfileDetails(
        profileState,
        CODEX_DEFAULT_PROCESS_PROFILE_KEY
      ),
      providerSessionId: threadId,
    };
  }

  async resumeSession(
    threadId: string,
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    const profileState = resolveCodexSessionProfileState(startOptions);
    const response = await this.process.request<Record<string, unknown>>(
      "thread/resume",
      {
        threadId,
        cwd: workspacePath ?? this.workspace.workspacePath,
        approvalPolicy:
          this.workspace.defaultApprovalMode ??
          CODEX_WORKFLOW_DEFAULT_APPROVAL_POLICY,
        sandbox:
          this.workspace.defaultSandboxMode ?? CODEX_WORKFLOW_DEFAULT_SANDBOX,
        model: this.workspace.defaultModel,
        persistExtendedHistory: false,
        ...buildCodexThreadProfileParams(profileState),
      }
    );
    const thread = isRecord(response.thread) ? response.thread : null;
    const resumedThreadId = asString(thread?.id) ?? threadId;
    this.ensureSessionState(resumedThreadId, workspacePath);
    this.handshakedThreadIds.add(resumedThreadId);
    this.eventRouter.emitRuntimeModel(resumedThreadId, response.model);
    this.eventRouter.emitCachedUsageLimits(resumedThreadId);
    return resumedThreadId;
  }

  async closeSession(threadId: string): Promise<void> {
    const state = this.sessions.get(threadId);
    if (state?.activeTurnId) {
      try {
        await this.process.request("turn/interrupt", {
          threadId,
          turnId: state.activeTurnId,
        });
      } catch {
        // Best-effort interrupt only.
      }
    }
    this.sessions.delete(threadId);
    this.handshakedThreadIds.delete(threadId);
    if (this.sessions.size === 0) {
      await this.process.stop();
    }
  }

  async sendMessage(
    threadId: string,
    content: string,
    turnOptions?: CodexTurnOptions
  ): Promise<void> {
    if (!this.handshakedThreadIds.has(threadId)) {
      throw new CodexSessionStaleBindingError(threadId);
    }
    const state = this.ensureSessionState(threadId);
    const appliedConfig = isRecord(turnOptions?.[CODEX_APPLIED_TURN_CONFIG_KEY])
      ? turnOptions[CODEX_APPLIED_TURN_CONFIG_KEY]
      : null;
    const modelId =
      asString(turnOptions?.model) ??
      asString(appliedConfig?.modelId) ??
      this.workspace.defaultModel;
    const reasoningEffort =
      asString(turnOptions?.reasoningEffort) ??
      asString(appliedConfig?.reasoningEffort) ??
      this.workspace.defaultReasoningEffort ??
      null;
    const outputSchema =
      turnOptions && isRecord(turnOptions) && "outputSchema" in turnOptions
        ? turnOptions.outputSchema
        : undefined;
    const modelSwitchInputItem = buildModelSwitchInputItem(turnOptions);
    const response = await this.process.request<Record<string, unknown>>(
      "turn/start",
      {
        threadId,
        input: [
          ...(modelSwitchInputItem ? [modelSwitchInputItem] : []),
          {
            type: "text",
            text: content,
            text_elements: [],
          },
        ],
        cwd: state.workspacePath,
        model: modelId,
        effort: reasoningEffort,
        ...buildCodexReasoningSummaryParams(
          modelId,
          resolveTurnReasoningSummaryMode()
        ),
        ...(outputSchema === undefined ? {} : { outputSchema }),
      }
    );
    const turn = isRecord(response.turn) ? response.turn : null;
    const turnId = asString(turn?.id);
    if (turnId) {
      state.activeTurnId = turnId;
    }
  }

  async rollbackSessionTurns(
    threadId: string,
    numTurns: number
  ): Promise<CodexRollbackResult> {
    if (!this.handshakedThreadIds.has(threadId)) {
      throw new CodexSessionStaleBindingError(threadId);
    }
    if (!Number.isSafeInteger(numTurns) || numTurns < 1) {
      throw new Error("codex rollback numTurns must be a positive integer");
    }
    await this.process.request("thread/rollback", {
      threadId,
      numTurns,
    });
    const response = await this.process.request<Record<string, unknown>>(
      "thread/read",
      {
        threadId,
        includeTurns: true,
      }
    );
    return {
      providerSessionId: threadId,
      turns: countThreadTurns(response.thread),
    };
  }

  subscribe(
    threadId: string,
    listener: (payload: unknown) => void
  ): () => void {
    const state = this.ensureSessionState(threadId);
    state.listeners.add(listener);
    this.historyLoader.hydrate(threadId).catch((error: unknown) => {
      this.reporter?.warn?.(
        `Unable to hydrate Codex subagent history for ${threadId}: ${String(error)}`
      );
    });
    return () => {
      state.listeners.delete(listener);
    };
  }

  async refreshUsageLimits(): Promise<CodexUsageLimitsStreamPayload | null> {
    const response = await this.process.request<Record<string, unknown>>(
      "account/rateLimits/read"
    );
    return this.eventRouter.registerUsageLimitsSnapshot(response.rateLimits);
  }

  private ensureSessionState(
    threadId: string,
    workspacePath?: string
  ): AppServerSessionState {
    const existing = this.sessions.get(threadId);
    if (existing) {
      if (workspacePath) {
        existing.workspacePath = workspacePath;
      }
      return existing;
    }
    const state: AppServerSessionState = {
      activeTurnId: null,
      assistantTextByItemId: new Map<string, string>(),
      listeners: new Set<(payload: unknown) => void>(),
      reasoningSummariesByItemId: new Map<string, string[]>(),
      workspacePath: workspacePath ?? this.workspace.workspacePath,
    };
    this.sessions.set(threadId, state);
    return state;
  }

  private emit(threadId: string, payload: unknown): void {
    const state = this.sessions.get(threadId);
    if (!state || state.listeners.size === 0) {
      return;
    }
    for (const listener of state.listeners) {
      listener(payload);
    }
  }
}

function countThreadTurns(thread: unknown): number {
  if (!(isRecord(thread) && Array.isArray(thread.turns))) {
    return 0;
  }
  return thread.turns.length;
}
