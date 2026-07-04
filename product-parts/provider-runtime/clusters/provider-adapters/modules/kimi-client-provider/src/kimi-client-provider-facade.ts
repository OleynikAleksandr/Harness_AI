// Thin Kimi endpoint for the universal client. Holds Kimi's dialect specifics
// (base URL, model, thinking form) and builds a ClientTurnRequest the Core
// universal-client core runs. The Kimi Code subscription channel accepts a
// plain API key from a third-party client (verified via OpenCode). Contract:
// docs/architecture/UniversalClient.md sections 3.3 / 3.6.

import type {
  ClientMessage,
  ClientTurnRequest,
  DialectProfile,
  ToolDescriptor,
} from "../../../../../../core-runtime/clusters/universal-client/modules/client-contract/src/client-contract-facade.js";

// The single public Kimi Code coding model; the vendor rotates the backend.
export const KIMI_MODEL = "kimi-for-coding";

export const KIMI_DIALECT: DialectProfile = {
  baseUrl: "https://api.kimi.com/coding/v1",
  providerId: "kimi",
  thinkingForm: "reasoning_content",
  toolChoiceSupport: "auto_only",
  usageFromAnyChunk: false,
};

export interface KimiTurnInput {
  readonly apiKey: string;
  readonly messages: readonly ClientMessage[];
  readonly model?: string;
  readonly signal?: AbortSignal;
  readonly tools: readonly ToolDescriptor[];
}

// Assemble the Core client turn request for a Kimi session. The Core session
// route runs this through the universal-client agent loop; this module stays
// Kimi-specific and does not own the loop.
export const buildKimiTurnRequest = (
  input: KimiTurnInput
): ClientTurnRequest => ({
  apiKey: input.apiKey,
  dialect: KIMI_DIALECT,
  messages: input.messages,
  model: input.model ?? KIMI_MODEL,
  tools: input.tools,
  ...(input.signal ? { signal: input.signal } : {}),
});
