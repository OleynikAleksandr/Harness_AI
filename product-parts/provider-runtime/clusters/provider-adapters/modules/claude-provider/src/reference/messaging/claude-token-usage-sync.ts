import crypto from "node:crypto";
import { ClaudeContextUsageReader } from "../sdk/claude-context-usage-reader.js";
import type { ActiveSession } from "../session/types.js";
import type { ModuleReporter } from "../types.js";
import {
  areTokenUsageSnapshotsEqual,
  buildSdkOnlyTokenUsage,
  buildTokenUsageSnapshot,
  type SdkOnlyTokenUsage,
  type TokenUsageSnapshot,
} from "./claude-token-usage-snapshot.js";

export type { TokenUsageSnapshot } from "./claude-token-usage-snapshot.js";

const MIN_REFRESH_INTERVAL_MS = 1500;
const TEMP_SESSION_PREFIX = "temp_";

export interface ContextUsageReaderConfig {
  readonly executablePath: string;
  // Resolved at every probe run, never snapshotted: a one-shot env taken at
  // adapter initialize races the global-home liveness preflight and freezes
  // the probe onto the global provider home while turns write transcripts to
  // the workspace-local home (2026-07-14 acceptance fix).
  readonly resolveEnv: () => NodeJS.ProcessEnv;
}

export interface TokenUsageReadResult {
  readonly postTurnTokenUsageUnavailable: boolean;
  readonly tokenUsage: TokenUsageSnapshot | null;
}

interface ClaudeTokenUsageSyncOptions {
  readonly providerId?: string;
  readonly reporter?: ModuleReporter;
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

export class ClaudeTokenUsageSync {
  private contextUsageReader: ClaudeContextUsageReader | null = null;
  private readonly contextUsageInFlight = new Map<
    string,
    Promise<TokenUsageReadResult>
  >();
  private readonly contextUsageLastAttemptAt = new Map<string, number>();
  private readonly providerId: string;
  private readonly reporter?: ModuleReporter;
  private readonly sdkOnlyEmitCache = new Map<string, SdkOnlyTokenUsage>();
  private readonly tokenUsageCache = new Map<string, TokenUsageSnapshot>();

  constructor(options: ClaudeTokenUsageSyncOptions) {
    this.providerId = options.providerId ?? "claude";
    this.reporter = options.reporter;
  }

  configureContextUsageReader(config: ContextUsageReaderConfig): void {
    if (!this.contextUsageReader) {
      this.contextUsageReader = new ClaudeContextUsageReader(config);
    }
  }

  async readTokenUsage(
    session: ActiveSession,
    claudeSessionId: string | null | undefined,
    options: { readonly force?: boolean } = {}
  ): Promise<TokenUsageReadResult> {
    const reader = this.contextUsageReader;
    if (!reader) {
      return {
        tokenUsage: null,
        postTurnTokenUsageUnavailable: true,
      };
    }

    const resolvedId = resolveClaudeProviderSessionId(session, claudeSessionId);
    if (!resolvedId) {
      return {
        tokenUsage: null,
        postTurnTokenUsageUnavailable: true,
      };
    }

    const now = Date.now();
    const lastAttempt = this.contextUsageLastAttemptAt.get(resolvedId);
    if (
      !options.force &&
      lastAttempt &&
      now - lastAttempt < MIN_REFRESH_INTERVAL_MS
    ) {
      return {
        tokenUsage: null,
        postTurnTokenUsageUnavailable: false,
      };
    }
    this.contextUsageLastAttemptAt.set(resolvedId, now);

    const inFlight = this.contextUsageInFlight.get(resolvedId);
    if (inFlight) {
      if (options.force) {
        return await inFlight;
      }
      return {
        tokenUsage: this.tokenUsageCache.get(resolvedId) ?? null,
        postTurnTokenUsageUnavailable: false,
      };
    }

    const refreshPromise = reader
      .read({ sessionId: resolvedId, cwd: session.workspacePath })
      .then((snapshot) => {
        if (!snapshot) {
          this.emitSdkOnlyUsage(session, resolvedId);
          return {
            tokenUsage: null,
            postTurnTokenUsageUnavailable: true,
          } satisfies TokenUsageReadResult;
        }

        const nextUsage = buildTokenUsageSnapshot(snapshot, session.sdkUsage);
        const previous = this.tokenUsageCache.get(resolvedId);
        if (previous && areTokenUsageSnapshotsEqual(previous, nextUsage)) {
          return {
            tokenUsage: previous,
            postTurnTokenUsageUnavailable: false,
          } satisfies TokenUsageReadResult;
        }

        this.tokenUsageCache.set(resolvedId, nextUsage);
        session.eventEmitter.emit("message", {
          type: "stream_event",
          provider: this.providerId,
          sessionId: session.sessionId,
          claudeSessionId: resolvedId,
          tokenUsage: nextUsage,
          data: {
            kind: "token_usage",
            used: nextUsage.used,
            limit: nextUsage.limit,
            ...(nextUsage.cached === undefined
              ? {}
              : { cached: nextUsage.cached }),
            ...(nextUsage.sdkUsed === undefined
              ? {}
              : { sdkUsed: nextUsage.sdkUsed }),
          },
          uuid: `${crypto.randomUUID()}::token_usage`,
          timestamp: new Date().toISOString(),
        });
        return {
          tokenUsage: nextUsage,
          postTurnTokenUsageUnavailable: false,
        } satisfies TokenUsageReadResult;
      })
      .catch((error) => {
        this.reporter?.warn?.(
          `Claude /context token read failed (session ${resolvedId}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        this.emitSdkOnlyUsage(session, resolvedId);
        return {
          tokenUsage: this.tokenUsageCache.get(resolvedId) ?? null,
          postTurnTokenUsageUnavailable: !this.tokenUsageCache.has(resolvedId),
        } satisfies TokenUsageReadResult;
      })
      .finally(() => {
        this.contextUsageInFlight.delete(resolvedId);
      });

    this.contextUsageInFlight.set(resolvedId, refreshPromise);
    return await refreshPromise;
  }

  // The legacy `/context` probe can legitimately fail (e.g. the transcript is
  // unavailable to the probe environment); the SDK usage tracker's figures
  // still reach the panel on their own — the telemetry facade keeps the
  // previous legacy `used` for such partial events (2026-07-14 acceptance
  // fix).
  private emitSdkOnlyUsage(session: ActiveSession, resolvedId: string): void {
    const sdkOnly = buildSdkOnlyTokenUsage(session.sdkUsage);
    if (!sdkOnly) {
      return;
    }
    const previous = this.sdkOnlyEmitCache.get(resolvedId);
    if (
      previous &&
      previous.cached === sdkOnly.cached &&
      previous.sdkUsed === sdkOnly.sdkUsed
    ) {
      return;
    }
    this.sdkOnlyEmitCache.set(resolvedId, sdkOnly);
    session.eventEmitter.emit("message", {
      type: "stream_event",
      provider: this.providerId,
      sessionId: session.sessionId,
      claudeSessionId: resolvedId,
      tokenUsage: sdkOnly,
      data: {
        kind: "token_usage",
        cached: sdkOnly.cached,
        sdkUsed: sdkOnly.sdkUsed,
      },
      uuid: `${crypto.randomUUID()}::token_usage`,
      timestamp: new Date().toISOString(),
    });
  }
}

export { resolveClaudeProviderSessionId };
