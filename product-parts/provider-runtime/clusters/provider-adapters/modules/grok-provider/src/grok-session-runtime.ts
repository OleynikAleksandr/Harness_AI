import type {
  GrokAcpAuthMethod,
  GrokAcpInitializeResult,
  GrokAcpSessionSelection,
} from "./grok-acp-contracts.js";
import { GrokAcpProtocolError } from "./grok-acp-contracts.js";

export interface GrokSessionTransport {
  notify(method: string, params?: unknown): Promise<void>;
  request<TResult = unknown>(
    method: string,
    params?: unknown
  ): Promise<TResult>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface GrokSessionRuntimeOptions {
  readonly clientName?: string;
  readonly clientVersion?: string;
  readonly mcpServers?: readonly Readonly<Record<string, unknown>>[];
  readonly selection?: GrokAcpSessionSelection;
  readonly sessionMeta?: Readonly<Record<string, unknown>>;
  readonly transport: GrokSessionTransport;
  readonly workspacePath: string;
}

export interface GrokSessionStartResult {
  readonly initializeResult: GrokAcpInitializeResult;
  readonly providerSessionId: string;
  readonly selection: GrokAcpSessionSelection;
}

export function normalizeGrokTurnSelection(
  options: Readonly<Record<string, unknown>> | undefined
): GrokAcpSessionSelection | undefined {
  if (!options) {
    return;
  }
  const modelId =
    readOptionalString(options.model) ?? readOptionalString(options.modelId);
  const reasoningEffort = readOptionalString(options.reasoningEffort);
  if (!(modelId || reasoningEffort)) {
    return;
  }
  return {
    ...(modelId ? { modelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

const METHOD_NOT_FOUND_CODE = -32_601;
const AUTH_METHOD_PRIORITY = ["cached_token", "grok.com", "xai.api_key"];
const GROK_SESSION_PREFIX_PATTERN = /^grok:/u;

export class GrokSessionRuntime {
  readonly #options: GrokSessionRuntimeOptions;
  #initializeResult: GrokAcpInitializeResult | null = null;
  #providerSessionId: string | null = null;
  #selection: GrokAcpSessionSelection;
  #state: "closed" | "idle" | "open" = "idle";

  constructor(options: GrokSessionRuntimeOptions) {
    this.#options = options;
    this.#selection = normalizeSelection(options.selection);
  }

  get providerSessionId(): string | null {
    return this.#providerSessionId;
  }

  get selection(): GrokAcpSessionSelection {
    return this.#selection;
  }

  async initialize(): Promise<GrokAcpInitializeResult> {
    if (this.#state === "closed") {
      throw new Error("Cannot initialize a closed Grok session runtime.");
    }
    if (this.#initializeResult) {
      return this.#initializeResult;
    }
    await this.#options.transport.start();
    const result =
      await this.#options.transport.request<GrokAcpInitializeResult>(
        "initialize",
        {
          clientCapabilities: {
            fs: { readTextFile: false, writeTextFile: false },
            terminal: false,
          },
          clientInfo: {
            name: this.#options.clientName ?? "harness-ai",
            version: this.#options.clientVersion ?? "0.0.0",
          },
          protocolVersion: 1,
          _meta: {
            clientType: "harness-ai",
            clientVersion: this.#options.clientVersion ?? "0.0.0",
            startupHints: {
              nonInteractive: true,
              skipGitStatus: true,
              skipProjectLayout: true,
            },
          },
        }
      );
    await this.#authenticate(result.authMethods ?? []);
    this.#initializeResult = result;
    return result;
  }

  async create(): Promise<GrokSessionStartResult> {
    this.#requireIdle();
    const initializeResult = await this.initialize();
    const response = await this.#options.transport.request<unknown>(
      "session/new",
      this.#sessionParams()
    );
    const providerSessionId = readSessionId(response, "session/new");
    await this.#applySelection(providerSessionId, this.#selection);
    this.#bind(providerSessionId);
    return {
      initializeResult,
      providerSessionId,
      selection: this.#selection,
    };
  }

  async load(providerSessionId: string): Promise<GrokSessionStartResult> {
    this.#requireIdle();
    const normalizedId = normalizeSessionId(providerSessionId);
    const initializeResult = await this.initialize();
    await this.#options.transport.request("session/load", {
      ...this.#sessionParams(),
      sessionId: normalizedId,
    });
    await this.#applySelection(normalizedId, this.#selection);
    this.#bind(normalizedId);
    return {
      initializeResult,
      providerSessionId: normalizedId,
      selection: this.#selection,
    };
  }

  async prompt(
    content: string,
    selection?: GrokAcpSessionSelection
  ): Promise<unknown> {
    const providerSessionId = this.#requireOpen();
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new Error("Cannot send an empty Grok prompt.");
    }
    if (selection) {
      await this.#applySelection(providerSessionId, selection);
    }
    return await this.#options.transport.request("session/prompt", {
      prompt: [{ text: normalizedContent, type: "text" }],
      sessionId: providerSessionId,
    });
  }

  async cancel(): Promise<void> {
    const providerSessionId = this.#requireOpen();
    await this.#options.transport.notify("session/cancel", {
      sessionId: providerSessionId,
    });
  }

  async close(): Promise<void> {
    if (this.#state === "closed") {
      return;
    }
    this.#state = "closed";
    await this.#options.transport.stop();
  }

  async #authenticate(
    authMethods: readonly GrokAcpAuthMethod[]
  ): Promise<void> {
    const method = selectAuthMethod(authMethods);
    if (!method) {
      return;
    }
    await this.#options.transport.request("authenticate", {
      methodId: method.id,
      _meta: { headless: true },
    });
  }

  #sessionParams(): Readonly<Record<string, unknown>> {
    return {
      cwd: this.#options.workspacePath,
      mcpServers: this.#options.mcpServers ?? [],
      _meta: {
        ...this.#options.sessionMeta,
        ...this.#selection,
      },
    };
  }

  async #applySelection(
    providerSessionId: string,
    nextSelection: GrokAcpSessionSelection
  ): Promise<void> {
    const normalized = normalizeSelection({
      ...this.#selection,
      ...nextSelection,
    });
    if (!normalized.modelId) {
      if (normalized.reasoningEffort) {
        throw new Error(
          "Grok reasoning effort cannot be applied without a selected model."
        );
      }
      this.#selection = normalized;
      return;
    }
    const params = {
      modelId: normalized.modelId,
      sessionId: providerSessionId,
      ...(normalized.reasoningEffort
        ? { _meta: { reasoningEffort: normalized.reasoningEffort } }
        : {}),
    };
    try {
      await this.#options.transport.request("session/set_model", params);
    } catch (error) {
      if (!isMethodNotFound(error)) {
        throw error;
      }
      await this.#options.transport.request("session/setModel", params);
    }
    this.#selection = normalized;
  }

  #bind(providerSessionId: string): void {
    if (
      this.#providerSessionId &&
      this.#providerSessionId !== providerSessionId
    ) {
      throw new Error("Grok provider session identity cannot be rebound.");
    }
    this.#providerSessionId = providerSessionId;
    this.#state = "open";
  }

  #requireIdle(): void {
    if (this.#state !== "idle" || this.#providerSessionId) {
      throw new Error("Grok session runtime already has a provider session.");
    }
  }

  #requireOpen(): string {
    if (this.#state !== "open" || !this.#providerSessionId) {
      throw new Error("Grok provider session is not open.");
    }
    return this.#providerSessionId;
  }
}

function selectAuthMethod(
  methods: readonly GrokAcpAuthMethod[]
): GrokAcpAuthMethod | null {
  for (const id of AUTH_METHOD_PRIORITY) {
    const method = methods.find((candidate) => candidate.id === id);
    if (method) {
      return method;
    }
  }
  return methods[0] ?? null;
}

function normalizeSelection(
  selection: GrokAcpSessionSelection | undefined
): GrokAcpSessionSelection {
  const modelId = selection?.modelId?.trim();
  const reasoningEffort = selection?.reasoningEffort?.trim();
  return {
    ...(modelId ? { modelId } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

function normalizeSessionId(value: string): string {
  const normalized = value.trim().replace(GROK_SESSION_PREFIX_PATTERN, "");
  if (!normalized) {
    throw new Error("Cannot load a Grok session with an empty provider id.");
  }
  return normalized;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readSessionId(response: unknown, method: string): string {
  if (
    response &&
    typeof response === "object" &&
    "sessionId" in response &&
    typeof response.sessionId === "string" &&
    response.sessionId.trim()
  ) {
    return response.sessionId.trim();
  }
  throw new Error(`Grok ACP ${method} did not return a session id.`);
}

function isMethodNotFound(error: unknown): boolean {
  return (
    error instanceof GrokAcpProtocolError &&
    error.code === METHOD_NOT_FOUND_CODE
  );
}
