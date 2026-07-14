import crypto from "node:crypto";
import type { ActiveSession } from "../session/types.js";
import type {
  ClaudeStreamMessage,
  ClaudeUsageLimitBucket,
  ClaudeUsageLimits,
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
  ModuleReporter,
} from "../types.js";
import {
  buildTokenUsageSnapshot,
  type TokenUsageSnapshot as ClaudeTokenUsageSnapshot,
} from "./claude-token-usage-snapshot.js";

const CLAUDE_RUNTIME_RATE_LIMIT_INFO_ENV_KEY =
  "CODEAI_CLAUDE_RATE_LIMIT_INFO_PAYLOAD";
const TEMP_SESSION_PREFIX = "temp_";

export type { TokenUsageSnapshot } from "./claude-token-usage-snapshot.js";

// Environment used by the shared rate-limit reads; resolved at every use so
// the active provider home is honored (the legacy `/context` probe that this
// config once configured retired 2026-07-14).
export interface ClaudeUsageEnvironmentConfig {
  readonly resolveEnv: () => NodeJS.ProcessEnv;
}

const resolveClaudeProviderSessionId = (
  session: ActiveSession,
  claudeSessionId: string | null | undefined
): string | null => {
  const candidate = claudeSessionId ?? session.sessionId;
  return !candidate || candidate.startsWith(TEMP_SESSION_PREFIX)
    ? null
    : candidate;
};

interface ClaudeUsageSyncOptions {
  readonly providerId?: string;
  readonly reporter?: ModuleReporter;
  readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const areUsageLimitBucketsEqual = (
  left: ClaudeUsageLimitBucket | null | undefined,
  right: ClaudeUsageLimitBucket | null | undefined
): boolean => {
  if (!(left || right)) {
    return true;
  }
  if (!(left && right)) {
    return false;
  }
  return (
    left.percentUsed === right.percentUsed && left.resetsAt === right.resetsAt
  );
};

const areUsageLimitsPayloadEqual = (
  left: ClaudeUsageLimitsStreamPayload | null,
  right: ClaudeUsageLimitsStreamPayload | null
): boolean =>
  !(left || right) ||
  Boolean(
    left &&
      right &&
      left.providerScopeKey === right.providerScopeKey &&
      left.data.source === right.data.source &&
      left.data.collectedAt === right.data.collectedAt &&
      areUsageLimitBucketsEqual(
        left.usageLimits?.currentSession,
        right.usageLimits?.currentSession
      ) &&
      areUsageLimitBucketsEqual(
        left.usageLimits?.currentWeekAllModels,
        right.usageLimits?.currentWeekAllModels
      ) &&
      areUsageLimitBucketsEqual(
        left.usageLimits?.currentWeekSonnetOnly,
        right.usageLimits?.currentWeekSonnetOnly
      )
  );

const buildRuntimeUsageLimitsPayload = (
  message: ClaudeStreamMessage
): string | null => {
  let rateLimitInfo: Record<string, unknown> | null = null;
  if (isRecord(message.rate_limit_info)) {
    rateLimitInfo = message.rate_limit_info;
  } else if (isRecord(message.rateLimitInfo)) {
    rateLimitInfo = message.rateLimitInfo;
  }
  if (!rateLimitInfo) {
    return null;
  }
  const rateLimitType = rateLimitInfo.rateLimitType;
  if (
    rateLimitType !== "five_hour" &&
    rateLimitType !== "seven_day" &&
    rateLimitType !== "seven_day_sonnet"
  ) {
    return null;
  }
  return JSON.stringify({
    collectedAt:
      typeof message.timestamp === "string"
        ? message.timestamp
        : new Date().toISOString(),
    rateLimitInfo,
  });
};

export class ClaudeUsageSync {
  private readonly latestRuntimeUsageLimitsPayload = new Map<string, string>();
  private readonly providerId: string;
  private readonly reporter?: ModuleReporter;
  private readonly usageLimitsFacade?: ClaudeUsageLimitsFacadeBridge;
  private resolveUsageLimitsEnvironment: (() => NodeJS.ProcessEnv) | undefined;

  constructor(options: ClaudeUsageSyncOptions) {
    this.providerId = options.providerId ?? "claude";
    this.reporter = options.reporter;
    this.usageLimitsFacade = options.usageLimitsFacade;
  }

  configureUsageEnvironment(config: ClaudeUsageEnvironmentConfig): void {
    // Per-use env resolution: a one-shot snapshot freezes onto whichever
    // provider home was active at adapter initialize (2026-07-14 fix).
    this.resolveUsageLimitsEnvironment = config.resolveEnv;
  }

  async readCompletionPayload(
    session: ActiveSession,
    claudeSessionId: string | null | undefined
  ): Promise<{
    readonly postTurnTokenUsageUnavailable: boolean;
    readonly tokenUsage?: ClaudeTokenUsageSnapshot | null;
    readonly usageLimits?: ClaudeUsageLimits;
  }> {
    // Turn-completion snapshot straight from the SDK usage tracker; mid-turn
    // updates already streamed via ClaudeLiveUsageEmitter.
    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      claudeSessionId
    );
    const tokenUsage = resolvedId
      ? buildTokenUsageSnapshot(session.sdkUsage)
      : null;
    const usageLimits = await this.refreshUsageLimitsFromUsage(
      session,
      claudeSessionId,
      { force: true }
    );
    return {
      tokenUsage,
      usageLimits,
      postTurnTokenUsageUnavailable: !tokenUsage,
    };
  }

  async handleRateLimitEvent(
    session: ActiveSession,
    message: ClaudeStreamMessage
  ): Promise<void> {
    const facade = this.usageLimitsFacade;
    if (!facade) {
      return;
    }
    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      message.session_id
    );
    const runtimePayload = buildRuntimeUsageLimitsPayload(message);
    if (!(resolvedId && runtimePayload)) {
      return;
    }
    this.latestRuntimeUsageLimitsPayload.set(resolvedId, runtimePayload);
    const previousPayload = facade.getCachedStreamPayload({
      providerSessionId: resolvedId,
    });
    const nextPayload = await facade
      .readStreamPayload({
        workspacePath: session.workspacePath,
        runtimeSessionId: session.sessionId,
        providerSessionId: resolvedId,
        environment: this.buildUsageLimitsEnvironment(resolvedId),
        force: true,
      })
      .catch((error: unknown) => {
        this.reporter?.warn?.(
          `Claude runtime usage limits read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return null;
      });
    if (
      !nextPayload?.usageLimits ||
      areUsageLimitsPayloadEqual(previousPayload, nextPayload)
    ) {
      return;
    }
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: this.providerId,
      sessionId: session.sessionId,
      claudeSessionId: resolvedId,
      usageLimits: nextPayload.usageLimits,
      data: nextPayload.data,
      uuid: `${crypto.randomUUID()}::usage_limits`,
      timestamp: new Date().toISOString(),
    });
  }

  private async refreshUsageLimitsFromUsage(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    options: { readonly force?: boolean } = {}
  ): Promise<ClaudeUsageLimits> {
    const facade = this.usageLimitsFacade;
    if (!facade) {
      return null;
    }
    const resolvedId = this.resolveTokenUsageSessionId(
      session,
      claudeSessionId
    );
    if (!resolvedId) {
      return null;
    }
    const previousPayload = facade.getCachedStreamPayload({
      providerSessionId: resolvedId,
    });
    const nextPayload = await facade
      .readStreamPayload({
        workspacePath: session.workspacePath,
        runtimeSessionId: session.sessionId,
        providerSessionId: resolvedId,
        environment: this.buildUsageLimitsEnvironment(resolvedId),
        force: options.force,
      })
      .catch((error: unknown) => {
        this.reporter?.warn?.(
          `Claude shared usage limits read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return null;
      });
    if (!nextPayload?.usageLimits) {
      return null;
    }
    if (!areUsageLimitsPayloadEqual(previousPayload, nextPayload)) {
      session.eventEmitter.emit("message", {
        type: "stream_event",
        provider: this.providerId,
        sessionId: session.sessionId,
        claudeSessionId: resolvedId,
        usageLimits: nextPayload.usageLimits,
        data: nextPayload.data,
        uuid: `${crypto.randomUUID()}::usage_limits`,
        timestamp: new Date().toISOString(),
      });
    }
    return nextPayload.usageLimits;
  }

  private resolveTokenUsageSessionId(
    session: ActiveSession,
    claudeSessionId: string | null | undefined
  ): string | null {
    return resolveClaudeProviderSessionId(session, claudeSessionId);
  }

  private buildUsageLimitsEnvironment(
    providerSessionId: string
  ): NodeJS.ProcessEnv | undefined {
    const runtimePayload =
      this.latestRuntimeUsageLimitsPayload.get(providerSessionId);
    const environment = this.resolveUsageLimitsEnvironment?.();
    return runtimePayload
      ? {
          ...(environment ?? {}),
          [CLAUDE_RUNTIME_RATE_LIMIT_INFO_ENV_KEY]: runtimePayload,
        }
      : environment;
  }
}
