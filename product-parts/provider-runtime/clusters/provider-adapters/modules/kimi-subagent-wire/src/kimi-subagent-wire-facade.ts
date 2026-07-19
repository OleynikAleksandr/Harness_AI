// Public facade of the Kimi subagent wire module. The Kimi CLI's ACP stream
// is silent about subagent internals (verified live 2026-07-19, CLI 0.26.0),
// so a synthesized `kimi-agent-*` child session gets its dialog, turn
// lifecycle and telemetry from the child agent's own `wire.jsonl` inside the
// CLI session store. This module resolves the child id to that wire
// (`resolveKimiSubagentWirePath`) and tails it incrementally
// (`createKimiSubagentWireReader`), normalizing wire rows into the standard
// provider events the unmodified Core pipeline already routes:
//
// - `content.part` think → `dialog_message` `{role: "thinking", tag: "thinking"}`;
//   text → `{role: "assistant"}` — `session-reasoning-display` projects both.
// - `turn.prompt` → `turn_started` (telemetry status → running).
// - `usage.record` with `usageScope: "turn"` → a `token_usage` stream event
//   (`used = inputOther + output + inputCacheCreation + inputCacheRead`,
//   `cached = inputCacheRead` — the `parseKimiWireUsage` formula; no `limit`
//   is emitted so the Core `mergeTokenUsage` keeps the seeded catalog limit)
//   followed by `turn_completed`. Both carry the native `turnCount` (the
//   running count of turn-scoped usage records): `resolveProviderTurnCount`
//   prefers a native count over its own `turn_completed` increment, so the
//   pair never double-counts.
//
// Deterministic event ids (`<childProviderSessionId>:wire:<lineNo>`) make a
// from-offset-0 replay after a Core restart idempotent once Core skips
// already-persisted message ids. Tool call/result and step boundary rows are
// skipped by design: the dialog renders no tool calls even for main
// sessions.

import { closeSync, openSync, readSync, statSync } from "node:fs";

export { resolveKimiSubagentWirePath } from "./kimi-subagent-wire-resolve.js";

export interface KimiSubagentWireTokenUsage {
  readonly cached: number;
  readonly used: number;
}

export type KimiSubagentWireEvent =
  | {
      readonly content: string;
      readonly role: "assistant" | "thinking";
      readonly tag?: string;
      readonly timestamp?: string;
      readonly type: "dialog_message";
      readonly uuid: string;
    }
  | {
      readonly timestamp?: string;
      readonly turnCount?: number;
      readonly type: "turn_completed" | "turn_started";
      readonly uuid: string;
    }
  | {
      readonly data: {
        readonly kind: "token_usage";
        readonly tokenUsage: KimiSubagentWireTokenUsage;
        readonly turnCount: number;
      };
      readonly timestamp?: string;
      readonly type: "stream_event";
      readonly uuid: string;
    };

export interface KimiSubagentWireReader {
  // Returns the provider events normalized from the wire bytes appended
  // since the previous call. A trailing incomplete line stays buffered until
  // its newline arrives; a truncated/rotated file restarts from offset 0
  // (deterministic ids keep the replay idempotent downstream). Sync IO like
  // the neighboring wire readers: the poller calls this on its cadence.
  readNewEvents(): KimiSubagentWireEvent[];
}

export function createKimiSubagentWireReader(options: {
  readonly childProviderSessionId: string;
  readonly wirePath: string;
}): KimiSubagentWireReader {
  return new OffsetKimiSubagentWireReader(
    options.childProviderSessionId,
    options.wirePath
  );
}

class OffsetKimiSubagentWireReader implements KimiSubagentWireReader {
  private readonly childProviderSessionId: string;
  private readonly wirePath: string;
  private offset = 0;
  private pending = Buffer.alloc(0);
  private lineNo = 0;
  private turnCount = 0;

  constructor(childProviderSessionId: string, wirePath: string) {
    this.childProviderSessionId = childProviderSessionId;
    this.wirePath = wirePath;
  }

  readNewEvents(): KimiSubagentWireEvent[] {
    const size = readFileSize(this.wirePath);
    if (size === null) {
      return [];
    }
    if (size < this.offset) {
      this.offset = 0;
      this.pending = Buffer.alloc(0);
      this.lineNo = 0;
      this.turnCount = 0;
    }
    if (size === this.offset) {
      return [];
    }
    const chunk = readChunk(this.wirePath, this.offset, size - this.offset);
    if (!chunk || chunk.length === 0) {
      return [];
    }
    this.offset += chunk.length;
    const buffer = Buffer.concat([this.pending, chunk]);
    // Newline bytes never appear inside a multi-byte UTF-8 sequence, so
    // cutting the pending buffer at the last newline is encoding-safe.
    const lastNewline = buffer.lastIndexOf(0x0a);
    if (lastNewline < 0) {
      this.pending = buffer;
      return [];
    }
    const complete = buffer.subarray(0, lastNewline).toString("utf8");
    this.pending = buffer.subarray(lastNewline + 1);
    const events: KimiSubagentWireEvent[] = [];
    for (const line of complete.split("\n")) {
      this.lineNo += 1;
      const row = parseWireLine(line);
      if (row) {
        events.push(...this.normalizeRow(row, this.lineNo));
      }
    }
    return events;
  }

  private normalizeRow(
    row: Record<string, unknown>,
    lineNo: number
  ): KimiSubagentWireEvent[] {
    if (row.type === "turn.prompt") {
      return [
        {
          ...readTimestamp(row.time),
          type: "turn_started",
          uuid: `${this.childProviderSessionId}:wire:${lineNo}:turn_started`,
        },
      ];
    }
    if (row.type === "usage.record") {
      return this.normalizeUsageRecord(row, lineNo);
    }
    if (row.type === "context.append_loop_event") {
      return this.normalizeLoopEvent(row, lineNo);
    }
    return [];
  }

  private normalizeUsageRecord(
    row: Record<string, unknown>,
    lineNo: number
  ): KimiSubagentWireEvent[] {
    if (row.usageScope !== "turn" || !isRecord(row.usage)) {
      return [];
    }
    this.turnCount += 1;
    const cached = readCount(row.usage.inputCacheRead);
    const used =
      readCount(row.usage.inputOther) +
      readCount(row.usage.output) +
      readCount(row.usage.inputCacheCreation) +
      cached;
    const turnCount = this.turnCount;
    return [
      {
        data: { kind: "token_usage", tokenUsage: { cached, used }, turnCount },
        ...readTimestamp(row.time),
        type: "stream_event",
        uuid: `${this.childProviderSessionId}:wire:${lineNo}:token_usage`,
      },
      {
        ...readTimestamp(row.time),
        turnCount,
        type: "turn_completed",
        uuid: `${this.childProviderSessionId}:wire:${lineNo}:turn_completed`,
      },
    ];
  }

  private normalizeLoopEvent(
    row: Record<string, unknown>,
    lineNo: number
  ): KimiSubagentWireEvent[] {
    const event = isRecord(row.event) ? row.event : null;
    if (!event || event.type !== "content.part" || !isRecord(event.part)) {
      return [];
    }
    const part = event.part;
    const thinking = part.type === "think";
    if (!thinking && part.type !== "text") {
      return [];
    }
    const raw = thinking ? part.think : part.text;
    const content = typeof raw === "string" ? raw.trim() : "";
    if (!content) {
      return [];
    }
    return [
      {
        content,
        role: thinking ? "thinking" : "assistant",
        ...(thinking ? { tag: "thinking" } : {}),
        ...readTimestamp(row.time),
        type: "dialog_message",
        uuid: `${this.childProviderSessionId}:wire:${lineNo}`,
      },
    ];
  }
}

function readFileSize(filePath: string): number | null {
  try {
    return statSync(filePath).size;
  } catch {
    return null;
  }
}

function readChunk(
  filePath: string,
  offset: number,
  length: number
): Buffer | null {
  let fd: number;
  try {
    fd = openSync(filePath, "r");
  } catch {
    return null;
  }
  try {
    const buffer = Buffer.alloc(length);
    const bytesRead = readSync(fd, buffer, 0, length, offset);
    return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    try {
      closeSync(fd);
    } catch {
      // A close failure loses nothing; the next poll reopens the file.
    }
  }
}

function parseWireLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Wire rows timestamp as epoch milliseconds in a top-level `time` field.
function readTimestamp(value: unknown): { readonly timestamp?: string } {
  return typeof value === "number" && Number.isFinite(value)
    ? { timestamp: new Date(value).toISOString() }
    : {};
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
