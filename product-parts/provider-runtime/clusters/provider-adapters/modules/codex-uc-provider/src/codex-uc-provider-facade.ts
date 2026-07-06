import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { resolveCodexReasoningEffort } from "../../../../../../core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.js";
import { createBuiltinToolSource } from "../../../../../../core-runtime/clusters/universal-client/modules/builtin-tools/src/builtin-tools-facade.js";
import {
  createToolRegistry,
  type ToolRegistry,
} from "../../../../../../core-runtime/clusters/universal-client/modules/tool-registry/src/tool-registry-facade.js";
import type { NormalizedProviderEvent } from "../../../../provider-events-and-translation/modules/provider-event-normalizer/src/provider-event-normalizer-facade.js";
import type {
  ProviderAdapter,
  ProviderEventListener,
  ProviderProfileApplicationDetails,
  ProviderSessionStartOptions,
  ProviderSessionStartOutcome,
  ProviderTurnOptions,
} from "../../provider-adapter-contract/src/provider-adapter-contract-facade.js";
import {
  buildCodexUcResponsesRequest,
  isFunctionCall,
  isInputItem,
  parseResponsesStream,
  type ResponsesInputItem,
  type ResponsesParsedStream,
  type ResponsesUsage,
  toInputItem,
} from "./codex-uc-responses.js";

export { buildCodexUcResponsesRequest } from "./codex-uc-responses.js";

const CODEX_OAUTH_RESPONSES_URL =
  "https://chatgpt.com/backend-api/codex/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_CONTEXT_LIMIT = 200_000;
const DEFAULT_INSTRUCTIONS =
  "You are CodexUC, a Harness AI test provider. Use only the provided function tools and answer the user directly.";
const AUTH_MISSING_MESSAGE =
  "Codex OAuth auth is missing. Sign in with Codex/ChatGPT first.";

interface CodexAuthTokens {
  readonly accessToken: string;
  readonly accountId: string;
}

interface CodexUcSessionState {
  abort: AbortController | null;
  readonly instructions: string;
  readonly listeners: Set<ProviderEventListener>;
  readonly messages: ResponsesInputItem[];
  readonly profileApplication: ProviderProfileApplicationDetails;
  readonly workspacePath: string;
}

export class CodexUcProviderFacade implements ProviderAdapter {
  private readonly authPath: string;
  private readonly defaultWorkspacePath: string;
  private readonly registry: ToolRegistry;
  private readonly sessions = new Map<string, CodexUcSessionState>();

  constructor(
    workspacePath: string = process.cwd(),
    options: { readonly authPath?: string } = {}
  ) {
    this.defaultWorkspacePath = workspacePath;
    this.authPath =
      options.authPath ?? path.join(homedir(), ".codex", "auth.json");
    this.registry = createToolRegistry();
    this.registry.registerSource(createBuiltinToolSource());
  }

  createSession(
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    const sessionId = `codex-uc-${randomUUID()}`;
    const session = this.createSessionState(workspacePath, options);
    this.sessions.set(sessionId, session);
    return Promise.resolve({
      appliedProfileApplication: session.profileApplication,
      providerSessionId: sessionId,
    });
  }

  resumeSession(
    sessionId: string,
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): Promise<ProviderSessionStartOutcome> {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(
        sessionId,
        this.createSessionState(workspacePath, options)
      );
    }
    const session = this.requireSession(sessionId);
    return Promise.resolve({
      appliedProfileApplication: session.profileApplication,
      providerSessionId: sessionId,
    });
  }

  async sendMessage(
    sessionId: string,
    content: string,
    turnOptions: ProviderTurnOptions = {}
  ): Promise<void> {
    const session = this.requireSession(sessionId);
    const auth = this.readAuth();
    if (!auth) {
      this.emitAuthFailed(session);
      return;
    }
    session.abort?.abort();
    const abort = new AbortController();
    session.abort = abort;
    session.messages.push({ content, role: "user" });
    this.emit(session, event("turn_started"));
    try {
      await this.runTurn(session, auth, turnOptions, abort.signal);
      this.emit(session, event("turn_completed"));
    } catch (error) {
      if (!abort.signal.aborted) {
        this.emit(session, event("turn_failed"));
        this.emit(session, {
          message: error instanceof Error ? error.message : String(error),
          timestamp: nowIso(),
          type: "stream_error",
          uuid: randomUUID(),
        });
      }
    } finally {
      if (session.abort === abort) {
        session.abort = null;
      }
    }
  }

  subscribe(sessionId: string, listener: ProviderEventListener): () => void {
    const session = this.requireSession(sessionId);
    session.listeners.add(listener);
    return () => session.listeners.delete(listener);
  }

  closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    session?.abort?.abort();
    if (session) {
      session.abort = null;
    }
    return Promise.resolve();
  }

  deleteSessionArtifacts(providerSessionId: string): void {
    this.sessions.delete(providerSessionId);
  }

  private createSessionState(
    workspacePath?: string,
    options?: ProviderSessionStartOptions
  ): CodexUcSessionState {
    const managedProfile =
      options?.profileKind === "managed" && options.profile;
    const instructions = managedProfile
      ? options.profile?.prompt
      : DEFAULT_INSTRUCTIONS;
    return {
      abort: null,
      instructions: instructions ?? DEFAULT_INSTRUCTIONS,
      listeners: new Set(),
      messages: [],
      profileApplication: {
        profileId: options?.profile?.profileId ?? "native",
        route: "codex-oauth-responses",
        store: false,
        toolSurface: "harness-universal-client-builtins",
      },
      workspacePath: workspacePath ?? this.defaultWorkspacePath,
    };
  }

  private async runTurn(
    session: CodexUcSessionState,
    auth: CodexAuthTokens,
    turnOptions: ProviderTurnOptions,
    signal: AbortSignal
  ): Promise<void> {
    for (let step = 0; step < 64; step += 1) {
      const parsed = await this.callResponses(
        session,
        auth,
        turnOptions,
        signal
      );
      const outputItems = parsed.outputItems;
      session.messages.push(
        ...outputItems.map(toInputItem).filter(isInputItem)
      );
      this.emitUsage(session, parsed.completed?.usage);
      const calls = outputItems.filter(isFunctionCall);
      if (calls.length === 0) {
        return;
      }
      for (const call of calls) {
        const result = await this.registry.execute(call.name, call.arguments, {
          signal,
          workspacePath: session.workspacePath,
        });
        session.messages.push({
          call_id: call.call_id,
          output: result.output,
          type: "function_call_output",
        });
      }
    }
    throw new Error("CodexUC turn exceeded 64 tool steps.");
  }

  private async callResponses(
    session: CodexUcSessionState,
    auth: CodexAuthTokens,
    turnOptions: ProviderTurnOptions,
    signal: AbortSignal
  ): Promise<ResponsesParsedStream> {
    const model =
      typeof turnOptions.model === "string" ? turnOptions.model : DEFAULT_MODEL;
    const reasoningEffort =
      typeof turnOptions.reasoningEffort === "string"
        ? turnOptions.reasoningEffort
        : resolveCodexReasoningEffort(model, undefined);
    const body = buildCodexUcResponsesRequest({
      instructions: session.instructions,
      items: session.messages,
      model,
      reasoningEffort,
      tools: this.registry.listDescriptors(),
    });
    const response = await fetch(CODEX_OAUTH_RESPONSES_URL, {
      body: JSON.stringify(body),
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "chatgpt-account-id": auth.accountId,
        "content-type": "application/json",
      },
      method: "POST",
      signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`CodexUC request failed (${response.status}): ${text}`);
    }
    return parseResponsesStream(text, (delta) =>
      this.emit(session, dialogMessage(delta))
    );
  }

  private readAuth(): CodexAuthTokens | null {
    try {
      const parsed = JSON.parse(readFileSync(this.authPath, "utf8")) as {
        readonly tokens?: {
          readonly access_token?: unknown;
          readonly account_id?: unknown;
        };
      };
      const accessToken = parsed.tokens?.access_token;
      const accountId = parsed.tokens?.account_id;
      return typeof accessToken === "string" && typeof accountId === "string"
        ? { accessToken, accountId }
        : null;
    } catch {
      return null;
    }
  }

  private emitUsage(
    session: CodexUcSessionState,
    usage?: ResponsesUsage
  ): void {
    const inputTokens = usage?.input_tokens;
    if (typeof inputTokens !== "number") {
      return;
    }
    this.emit(session, {
      data: {
        kind: "token_usage",
        tokenUsage: {
          cached: usage?.input_tokens_details?.cached_tokens ?? 0,
          limit: DEFAULT_CONTEXT_LIMIT,
          used: inputTokens,
        },
      },
      timestamp: nowIso(),
      type: "stream_event",
      uuid: randomUUID(),
    });
  }

  private emitAuthFailed(session: CodexUcSessionState): void {
    this.emit(session, event("turn_failed"));
    this.emit(session, {
      message: AUTH_MISSING_MESSAGE,
      timestamp: nowIso(),
      type: "stream_error",
      uuid: randomUUID(),
    });
  }

  private requireSession(sessionId: string): CodexUcSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown codex-uc session: ${sessionId}`);
    }
    return session;
  }

  private emit(
    session: CodexUcSessionState,
    eventPayload: NormalizedProviderEvent
  ): void {
    for (const listener of [...session.listeners]) {
      listener(eventPayload);
    }
  }
}

function dialogMessage(content: string): NormalizedProviderEvent {
  return {
    content,
    role: "assistant",
    tag: "live",
    timestamp: nowIso(),
    type: "dialog_message",
    uuid: randomUUID(),
  };
}

function event(type: "turn_completed" | "turn_failed" | "turn_started") {
  return { timestamp: nowIso(), type, uuid: randomUUID() };
}

function nowIso(): string {
  return new Date().toISOString();
}

export const codexUcProviderFacade = new CodexUcProviderFacade();
