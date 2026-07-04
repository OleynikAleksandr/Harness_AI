// The universal client agent loop: run a user turn to completion. Each step
// calls the model (streaming content/thinking as events), appends the assistant
// message, and — while the model returns tool calls — executes them full-auto
// through the registry and feeds the results back, until the model stops asking
// for tools. Guards: a step ceiling and a doom-loop detector. Failures become a
// single turn_failed event. Contract: docs/architecture/UniversalClient.md 3.1.

import type {
  ClientMessage,
  ClientToolCall,
  ClientTurnEvent,
  ClientTurnRequest,
} from "../../client-contract/src/client-contract-facade.js";
import type { ToolRegistry } from "../../tool-registry/src/tool-registry-facade.js";
import { ClientTurnError, callModel } from "./client-core-http.js";

export { mapClientTurnEvent } from "./client-core-events.js";

const MAX_STEPS = 64;
const DOOM_LOOP_REPEATS = 3;

export interface RunClientTurnParams {
  readonly maxSteps?: number;
  readonly onEvent: (event: ClientTurnEvent) => void;
  readonly registry: ToolRegistry;
  readonly request: ClientTurnRequest;
  readonly workspacePath: string;
}

const toolCallSignature = (calls: readonly ClientToolCall[]): string =>
  JSON.stringify(calls.map((call) => [call.name, call.argumentsJson]));

// Execute one step's tool calls in parallel and return their tool result
// messages (a tool error is already an output string, never a throw).
const executeToolCalls = (
  calls: readonly ClientToolCall[],
  registry: ToolRegistry,
  workspacePath: string,
  signal?: AbortSignal
): Promise<ClientMessage[]> =>
  Promise.all(
    calls.map(async (call): Promise<ClientMessage> => {
      const result = await registry.execute(call.name, call.argumentsJson, {
        workspacePath,
        ...(signal ? { signal } : {}),
      });
      return { content: result.output, role: "tool", toolCallId: call.id };
    })
  );

export const runClientTurn = async (
  params: RunClientTurnParams
): Promise<void> => {
  const { onEvent, registry, request, workspacePath } = params;
  const maxSteps = params.maxSteps ?? MAX_STEPS;
  const history: ClientMessage[] = [...request.messages];
  const recentSignatures: string[] = [];
  onEvent({ kind: "turn_started" });
  try {
    for (let step = 0; step < maxSteps; step += 1) {
      const result = await callModel({
        dialect: request.dialect,
        messages: history,
        model: request.model,
        onContent: (text) => onEvent({ kind: "assistant_delta", text }),
        onThinking: (text) => onEvent({ kind: "thinking_delta", text }),
        tools: request.tools,
        ...(request.apiKey ? { apiKey: request.apiKey } : {}),
        ...(request.signal ? { signal: request.signal } : {}),
      });
      history.push({
        content: result.content,
        role: "assistant",
        ...(result.toolCalls.length > 0 ? { toolCalls: result.toolCalls } : {}),
      });
      if (result.toolCalls.length === 0) {
        onEvent({ kind: "turn_completed" });
        return;
      }
      const signature = toolCallSignature(result.toolCalls);
      recentSignatures.push(signature);
      const repeated =
        recentSignatures.length >= DOOM_LOOP_REPEATS &&
        recentSignatures
          .slice(-DOOM_LOOP_REPEATS)
          .every((entry) => entry === signature);
      if (repeated) {
        throw new ClientTurnError(
          "provider_error",
          "Doom loop: the same tool call repeated with no progress."
        );
      }
      const toolResults = await executeToolCalls(
        result.toolCalls,
        registry,
        workspacePath,
        request.signal
      );
      history.push(...toolResults);
    }
    throw new ClientTurnError(
      "provider_error",
      `Turn exceeded ${maxSteps} tool steps.`
    );
  } catch (error) {
    const reason =
      error instanceof ClientTurnError ? error.reason : "provider_error";
    onEvent({
      error: reason,
      kind: "turn_failed",
      text: error instanceof Error ? error.message : String(error),
    });
  }
};
