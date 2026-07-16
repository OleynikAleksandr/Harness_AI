import type { GrokAcpNotification } from "./grok-acp-contracts.js";
import { isRecord } from "./grok-acp-contracts.js";

const MAX_BLOCK_CHARS = 900;
const MIN_LONG_BLOCK_SPLIT_CHARS = 450;
const SEMANTIC_BOUNDARY_PATTERN = /(?:\n\s*\n|[.!?…](?:["'”’)}\]]*))(?=\s|$)/gu;

export interface GrokSemanticTextChunk {
  readonly promptId?: string | null;
  readonly sessionId: string;
  readonly text: string;
  readonly timestamp?: string;
}

export interface GrokSemanticTextBlock {
  readonly id: string;
  readonly text: string;
  readonly timestamp?: string;
}

interface StreamState {
  blockIndex: number;
  buffer: string;
  identity: string;
  timestamp?: string;
}

export class GrokSemanticStreamBuffer {
  readonly #states = new Map<string, StreamState>();
  readonly #turns = new Map<string, number>();

  append(chunk: GrokSemanticTextChunk): readonly GrokSemanticTextBlock[] {
    const identity = this.#identityFor(chunk);
    const existing = this.#states.get(chunk.sessionId);
    const blocks: GrokSemanticTextBlock[] = [];
    if (existing && existing.identity !== identity) {
      blocks.push(...this.#flushState(chunk.sessionId, existing));
    }
    const state = this.#states.get(chunk.sessionId) ?? {
      blockIndex: 0,
      buffer: "",
      identity,
    };
    state.buffer += chunk.text;
    state.timestamp = chunk.timestamp ?? state.timestamp;
    this.#states.set(chunk.sessionId, state);
    blocks.push(...this.#takeReadyBlocks(chunk.sessionId, state));
    return blocks;
  }

  flush(sessionId: string): readonly GrokSemanticTextBlock[] {
    const state = this.#states.get(sessionId);
    return state ? this.#flushState(sessionId, state) : [];
  }

  startTurn(sessionId: string): void {
    this.#states.delete(sessionId);
    this.#turns.set(sessionId, (this.#turns.get(sessionId) ?? 0) + 1);
  }

  #identityFor(chunk: GrokSemanticTextChunk): string {
    return (
      chunk.promptId?.trim() || `turn-${this.#turns.get(chunk.sessionId) ?? 0}`
    );
  }

  #takeReadyBlocks(
    sessionId: string,
    state: StreamState
  ): GrokSemanticTextBlock[] {
    const extracted = extractSemanticBlocks(state.buffer, false);
    state.buffer = extracted.remainder;
    return extracted.blocks.map((text) => this.#block(sessionId, state, text));
  }

  #flushState(sessionId: string, state: StreamState): GrokSemanticTextBlock[] {
    const extracted = extractSemanticBlocks(state.buffer, true);
    this.#states.delete(sessionId);
    return extracted.blocks.map((text) => this.#block(sessionId, state, text));
  }

  #block(
    sessionId: string,
    state: StreamState,
    text: string
  ): GrokSemanticTextBlock {
    const index = state.blockIndex;
    state.blockIndex += 1;
    return {
      id: `grok:${sessionId}:${state.identity}:thinking:${index}`,
      text,
      ...(state.timestamp ? { timestamp: state.timestamp } : {}),
    };
  }
}

export function isGrokReplayNotification(
  notification: GrokAcpNotification
): boolean {
  const params = unwrapNotificationParams(notification.params);
  const meta = isRecord(params?._meta) ? params._meta : null;
  return meta?.isReplay === true;
}

function extractSemanticBlocks(
  value: string,
  force: boolean
): { blocks: string[]; remainder: string } {
  const blocks: string[] = [];
  let cursor = 0;
  SEMANTIC_BOUNDARY_PATTERN.lastIndex = 0;
  for (let match = SEMANTIC_BOUNDARY_PATTERN.exec(value); match; ) {
    const end = match.index + match[0].length;
    pushBlock(blocks, value.slice(cursor, end));
    cursor = end;
    match = SEMANTIC_BOUNDARY_PATTERN.exec(value);
  }
  let remainder = value.slice(cursor);
  while (remainder.length > MAX_BLOCK_CHARS) {
    const splitAt = findLongBlockSplit(remainder);
    pushBlock(blocks, remainder.slice(0, splitAt));
    remainder = remainder.slice(splitAt);
  }
  if (force) {
    pushBlock(blocks, remainder);
    remainder = "";
  }
  return { blocks, remainder };
}

function findLongBlockSplit(value: string): number {
  const candidate = value.lastIndexOf(" ", MAX_BLOCK_CHARS);
  return candidate >= MIN_LONG_BLOCK_SPLIT_CHARS
    ? candidate + 1
    : MAX_BLOCK_CHARS;
}

function pushBlock(blocks: string[], value: string): void {
  const normalized = value.trim();
  if (normalized) {
    blocks.push(normalized);
  }
}

function unwrapNotificationParams(
  value: unknown
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.method === "string" && isRecord(value.params)
    ? value.params
    : value;
}
