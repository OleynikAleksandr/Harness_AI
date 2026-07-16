import { isRecord } from "./grok-acp-contracts.js";
import type { GrokSessionTransport } from "./grok-session-runtime.js";

export interface GrokRewindResult {
  readonly providerSessionId: string;
  readonly turns: number;
}

export class GrokRewindClient {
  readonly #transport: Pick<GrokSessionTransport, "request">;

  constructor(transport: Pick<GrokSessionTransport, "request">) {
    this.#transport = transport;
  }

  async rollbackTurns(
    providerSessionId: string,
    numTurns: number
  ): Promise<GrokRewindResult> {
    if (!(Number.isSafeInteger(numTurns) && numTurns > 0)) {
      throw new Error("Grok rollback numTurns must be a positive integer.");
    }
    const pointsResponse = await this.#transport.request(
      "_x.ai/rewind/points",
      { sessionId: providerSessionId }
    );
    const promptIndexes = readPromptIndexes(pointsResponse);
    const currentTurns = promptIndexes.length
      ? Math.max(...promptIndexes) + 1
      : 0;
    const targetPromptIndex = currentTurns - numTurns;
    if (targetPromptIndex < 0 || !promptIndexes.includes(targetPromptIndex)) {
      throw new Error(
        `Grok cannot rollback ${numTurns} turn(s) from ${currentTurns}.`
      );
    }
    const executeResponse = await this.#transport.request(
      "_x.ai/rewind/execute",
      {
        force: true,
        mode: "conversation_only",
        sessionId: providerSessionId,
        targetPromptIndex,
      }
    );
    const result = unwrapResult(executeResponse);
    if (result?.success !== true) {
      const error = readString(result?.error) ?? "Grok rewind was rejected.";
      throw new Error(error);
    }
    return { providerSessionId, turns: targetPromptIndex };
  }
}

function readPromptIndexes(payload: unknown): number[] {
  const result = unwrapResult(payload);
  const points = Array.isArray(result?.rewind_points)
    ? result.rewind_points
    : [];
  return points.flatMap((point) => {
    if (!isRecord(point)) {
      return [];
    }
    const value = point.prompt_index ?? point.promptIndex;
    return Number.isSafeInteger(value) && (value as number) >= 0
      ? [value as number]
      : [];
  });
}

function unwrapResult(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return isRecord(value.result) ? value.result : value;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
