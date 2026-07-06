import type {
  ProviderSessionStartOptions,
  ProviderSessionStartOutcome,
} from "../../../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  CodexAppServerFacade,
  type CodexRollbackResult,
} from "../app-server/codex-app-server-facade.js";
import {
  type CodexNativeRequestCaptureOptions,
  CodexNativeRequestCaptureService,
} from "../diagnostics/codex-native-request-capture-service.js";
import type {
  CodexModuleOptions,
  CodexTurnOptions,
  CodexUsageLimitsStreamPayload,
} from "../types.js";
import { deleteCodexRolloutArtifacts } from "./codex-rollout-cleanup.js";

export class CodexProviderAdapter {
  readonly usageLimitsFacade?: CodexModuleOptions["usageLimitsFacade"];
  private readonly facade: CodexAppServerFacade;
  private readonly nativeRequestCaptureService: CodexNativeRequestCaptureService;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(options: CodexModuleOptions) {
    this.usageLimitsFacade = options.usageLimitsFacade;
    this.facade = new CodexAppServerFacade(options);
    this.nativeRequestCaptureService = new CodexNativeRequestCaptureService({
      reporter: options.reporter,
      workspace: options.workspace,
    });
  }

  initialize(): Promise<void> {
    return this.facade.initialize();
  }

  createSession(
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.createSession(workspacePath, startOptions)
    );
  }

  resumeSession(
    sessionId: string,
    workspacePath?: string,
    startOptions?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.resumeSession(sessionId, workspacePath, startOptions)
    );
  }

  closeSession(sessionId: string): Promise<void> {
    return this.facade.closeSession(sessionId);
  }

  deleteSessionArtifacts(
    providerSessionId: string,
    workspacePath: string
  ): void {
    deleteCodexRolloutArtifacts(workspacePath, providerSessionId);
  }

  captureNativeRequest(
    options: CodexNativeRequestCaptureOptions
  ): Promise<void> {
    return this.enqueueProviderHomeOperation(() =>
      this.nativeRequestCaptureService.captureNativeRequest(options)
    );
  }

  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: CodexTurnOptions
  ): Promise<void> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.sendMessage(sessionId, content, turnOptions)
    );
  }

  rollbackSessionTurns(
    sessionId: string,
    numTurns: number
  ): Promise<CodexRollbackResult> {
    return this.enqueueProviderHomeOperation(() =>
      this.facade.rollbackSessionTurns(sessionId, numTurns)
    );
  }

  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void {
    return this.facade.subscribe(sessionId, listener);
  }

  async refreshUsageLimits(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }): Promise<void> {
    const payload = await this.enqueueProviderHomeOperation(() =>
      this.facade
        .refreshUsageLimits()
        .catch((): CodexUsageLimitsStreamPayload | null => null)
    );
    if (!payload) {
      return;
    }
    params.broadcast({
      providerScopeKey: payload.providerScopeKey,
      usageLimits: payload.usageLimits,
      data: payload.data,
      uuid: `${crypto.randomUUID()}::usage_limits`,
      timestamp: new Date().toISOString(),
    });
  }

  private enqueueProviderHomeOperation<TResult>(
    operation: () => Promise<TResult>
  ): Promise<TResult> {
    const previous = this.operationQueue ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.operationQueue = current.then(
      () => undefined,
      () => undefined
    );
    return current;
  }
}
