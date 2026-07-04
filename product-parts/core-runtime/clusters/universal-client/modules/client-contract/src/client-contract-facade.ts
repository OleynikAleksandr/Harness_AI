// Shared type contract for the Core-owned universal client (OpenAI-shape
// providers: Kimi, GLM, Local Models, OpenRouter). Types plus one pure helper;
// no I/O and no loop logic live here. Contract: docs/architecture/UniversalClient.md.

// OpenAI-shape conversation model.
export type ClientMessageRole = "system" | "user" | "assistant" | "tool";

export interface ClientToolCall {
  // Raw JSON arguments string as streamed by the model (parsed by the executor).
  readonly argumentsJson: string;
  // Provider-assigned tool-call id, echoed back on the matching tool result.
  readonly id: string;
  // The tool's qualified name (see qualifyToolName).
  readonly name: string;
}

export interface ClientMessage {
  readonly content: string;
  readonly role: ClientMessageRole;
  // Present on role: "tool" results, linking back to the call id.
  readonly toolCallId?: string;
  // Present on assistant turns that call tools.
  readonly toolCalls?: readonly ClientToolCall[];
}

// Where a tool descriptor comes from. Only "builtin" executes in MVP;
// "mcp"/"skill" are reserved registration sources for future modules
// (docs/architecture/UniversalClient.md sections 3.10 / 6), not implemented now.
export type ToolSource = "builtin" | "mcp" | "skill";

export interface ToolDescriptor {
  readonly description: string;
  // Bare tool name as exposed to the model (e.g. "read_file").
  readonly name: string;
  // JSON Schema for the tool parameters (native tool calling).
  readonly parametersSchema: Readonly<Record<string, unknown>>;
  // Source-namespaced id used internally so future sources never collide.
  readonly qualifiedName: string;
  readonly source: ToolSource;
}

// How the model streams its reasoning/thinking, per provider dialect. The core
// normalizes all forms onto one internal thinking channel.
export type ThinkingForm =
  | "reasoning_content" // Kimi / GLM / vLLM / llama.cpp-deepseek
  | "reasoning" // Ollama
  | "reasoning_details" // OpenRouter
  | "think_tags" // raw <think> tags inside content
  | "none";

// Whether the provider accepts the tool_choice parameter.
export type ToolChoiceSupport = "auto_only" | "full" | "unsupported";

// Declarative per-provider dialect capabilities the core degrades params by.
export interface DialectProfile {
  readonly baseUrl: string;
  // Optional provider-required headers beyond Authorization.
  readonly extraHeaders?: Readonly<Record<string, string>>;
  readonly providerId: string;
  readonly thinkingForm: ThinkingForm;
  readonly toolChoiceSupport: ToolChoiceSupport;
  // Some providers stream usage in any chunk (OpenRouter) vs only the final one.
  readonly usageFromAnyChunk: boolean;
}

// The full turn input an endpoint module hands to the core loop.
export interface ClientTurnRequest {
  readonly apiKey?: string;
  readonly dialect: DialectProfile;
  // Provider-specific request body additions. Core-owned OpenAI fields are
  // reserved and cannot be overridden by endpoint modules.
  readonly extraBody?: Readonly<Record<string, unknown>>;
  readonly messages: readonly ClientMessage[];
  readonly model: string;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

// Output turn events the core emits. The event-emission module maps these onto
// the Core NormalizedProviderEvent contract — a mechanical output->event
// mapping, NOT any normalization of the user's INPUT prompt.
export type ClientTurnEventKind =
  | "turn_started"
  | "assistant_delta"
  | "thinking_delta"
  | "turn_completed"
  | "turn_failed";

// Uniform client error taxonomy mapped into turn_failed.
export type ClientErrorReason =
  | "auth_failed"
  | "rate_limited"
  | "quota_exhausted"
  | "context_overflow"
  | "network"
  | "provider_error"
  | "aborted";

export interface ClientTurnEvent {
  // Present on turn_failed.
  readonly error?: ClientErrorReason;
  readonly kind: ClientTurnEventKind;
  // Present on assistant_delta / thinking_delta.
  readonly text?: string;
}

// Namespace a tool name by its source so future MCP/skill tools never collide
// with built-ins: mcp:<server>:<tool>, skill:<name>, built-in bare name.
export function qualifyToolName(
  source: ToolSource,
  name: string,
  serverName?: string
): string {
  if (source === "mcp") {
    return `mcp:${serverName ?? "unknown"}:${name}`;
  }
  if (source === "skill") {
    return `skill:${name}`;
  }
  return name;
}
