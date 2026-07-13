import { open, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

// Claude CLI stores subagents next to the parent transcript:
//   <projects>/<slug>/<sessionId>.jsonl                      parent transcript
//   <projects>/<slug>/<sessionId>/subagents/
//     agent-<agentId>.meta.json                              spawn metadata
//     agent-<agentId>.jsonl                                  child transcript
// (docs/architecture/ClaudeSubagentSessions.md, section 3).

const SUBAGENT_META_SUFFIX = ".meta.json";
const SUBAGENT_FILE_PREFIX = "agent-";

export interface ClaudeSubagentMeta {
  readonly agentId: string;
  readonly agentType: string;
  readonly description: string;
  readonly spawnDepth: number;
  readonly toolUseId: string;
}

export interface ClaudeSubagentDiscovery {
  readonly meta: ClaudeSubagentMeta;
  readonly transcriptPath: string;
}

export interface ClaudeSubagentToolUseResult {
  readonly agentId: string;
  readonly isError: boolean;
  readonly resolvedModel?: string;
  readonly status: string;
  readonly timestamp?: string;
}

export interface JsonlTailCursor {
  offset: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const resolveSubagentsDir = (parentTranscriptPath: string): string => {
  const dir = path.dirname(parentTranscriptPath);
  const sessionId = path.basename(parentTranscriptPath, ".jsonl");
  return path.join(dir, sessionId, "subagents");
};

const parseSubagentMeta = (
  agentId: string,
  raw: string
): ClaudeSubagentMeta | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const agentType = parsed.agentType;
  const description = parsed.description;
  const toolUseId = parsed.toolUseId;
  if (typeof toolUseId !== "string" || toolUseId.length === 0) {
    return null;
  }
  return {
    agentId,
    agentType: typeof agentType === "string" ? agentType : "agent",
    description: typeof description === "string" ? description : "",
    spawnDepth: typeof parsed.spawnDepth === "number" ? parsed.spawnDepth : 1,
    toolUseId,
  };
};

export const scanSubagentsDirectory = async (
  subagentsDir: string
): Promise<ClaudeSubagentDiscovery[]> => {
  let entries: string[] = [];
  try {
    entries = await readdir(subagentsDir);
  } catch {
    return [];
  }
  const discoveries: ClaudeSubagentDiscovery[] = [];
  for (const entry of entries.sort()) {
    if (
      !(
        entry.startsWith(SUBAGENT_FILE_PREFIX) &&
        entry.endsWith(SUBAGENT_META_SUFFIX)
      )
    ) {
      continue;
    }
    const agentId = entry.slice(
      SUBAGENT_FILE_PREFIX.length,
      entry.length - SUBAGENT_META_SUFFIX.length
    );
    if (agentId.length === 0) {
      continue;
    }
    let raw: string;
    try {
      raw = await readFile(path.join(subagentsDir, entry), "utf8");
    } catch {
      continue;
    }
    const meta = parseSubagentMeta(agentId, raw);
    if (!meta) {
      continue;
    }
    discoveries.push({
      meta,
      transcriptPath: path.join(
        subagentsDir,
        `${SUBAGENT_FILE_PREFIX}${agentId}.jsonl`
      ),
    });
  }
  return discoveries;
};

export const createJsonlTailCursor = (): JsonlTailCursor => ({ offset: 0 });

// Reads complete JSONL lines appended since the cursor offset. A trailing
// line without a newline stays unread (the CLI may still be writing it), so
// the cursor only ever advances past fully terminated lines.
export const readJsonlRecordsFrom = async (
  filePath: string,
  cursor: JsonlTailCursor
): Promise<unknown[]> => {
  let size = 0;
  try {
    const stats = await stat(filePath);
    size = stats.size;
  } catch {
    return [];
  }
  if (!Number.isFinite(size) || size <= cursor.offset) {
    return [];
  }
  const length = size - cursor.offset;
  const handle = await open(filePath, "r");
  let buffer: Buffer;
  let bytesRead = 0;
  try {
    buffer = Buffer.alloc(length);
    ({ bytesRead } = await handle.read(buffer, 0, length, cursor.offset));
  } finally {
    await handle.close();
  }
  const chunk = buffer.subarray(0, bytesRead);
  const lastNewline = chunk.lastIndexOf(0x0a);
  if (lastNewline < 0) {
    return [];
  }
  const text = chunk.subarray(0, lastNewline + 1).toString("utf8");
  cursor.offset += lastNewline + 1;
  const records: unknown[] = [];
  for (const line of text.split(/\r?\n/g)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines; the transcript keeps flowing.
    }
  }
  return records;
};

// The parent transcript records a finished subagent as a user record whose
// top-level toolUseResult carries the agentId and terminal status.
export const extractSubagentToolUseResult = (
  record: unknown
): ClaudeSubagentToolUseResult | null => {
  if (!isRecord(record)) {
    return null;
  }
  const toolUseResult = record.toolUseResult;
  if (!isRecord(toolUseResult)) {
    return null;
  }
  const agentId = toolUseResult.agentId;
  const status = toolUseResult.status;
  if (typeof agentId !== "string" || agentId.length === 0) {
    return null;
  }
  const message = record.message;
  const content = isRecord(message) ? message.content : null;
  const isError =
    Array.isArray(content) &&
    content.some(
      (block) =>
        isRecord(block) &&
        block.type === "tool_result" &&
        block.is_error === true
    );
  const fallbackStatus = isError ? "failed" : "completed";
  return {
    agentId,
    isError,
    ...(typeof toolUseResult.resolvedModel === "string"
      ? { resolvedModel: toolUseResult.resolvedModel }
      : {}),
    status: typeof status === "string" ? status : fallbackStatus,
    ...(typeof record.timestamp === "string"
      ? { timestamp: record.timestamp }
      : {}),
  };
};
