import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Child-id formats minted by the Kimi subagent normalizer (verified live
// 2026-07-19 against CLI 0.26.0 session stores):
//
// - Single `Agent` call root child: `kimi-agent-<n>:tool_<suffix>` where the
//   ACP toolCallId carries a CLI-side counter prefix `<n>:` that is NOT the
//   store agent index (observed `1:tool_…` → `agent-0`, `3:tool_…` →
//   `agent-1`/`agent-2`/`agent-3`), so a root id cannot be mapped by number.
//   The part after the counter is the wire-level `toolCallId` recorded in
//   the parent `agents/main/wire.jsonl` spawn `tool.call`; that call's
//   `args.prompt` reappears (after a possible `<git-context>…</git-context>`
//   prefix) as the child's first `turn.prompt`, which is the durable link
//   used here.
// - Swarm member child: `kimi-agent-<n>:tool_<suffix>:agent-<k>` — the
//   trailing store agent id resolves directly to `agents/agent-<k>/`.
// - Fallback for a store the parent wire cannot explain: the session
//   `state.json` agents map decides only when it lists exactly one
//   `type: "sub"` agent; anything more ambiguous resolves to null so the
//   caller can retry on a later poll.
const CHILD_ID_PREFIX = "kimi-agent-";
const SWARM_MEMBER_SUFFIX_PATTERN = /:agent-(\d+)$/u;
const ACP_COUNTER_PREFIX_PATTERN = /^\d+:/u;
const AGENT_DIR_PATTERN = /^agent-(\d+)$/u;
const LEADING_TAG_BLOCK_PATTERN = /^\s*<([\w-]+)[^>]*>[\s\S]*?<\/\1>\s*/u;
const LEADING_SELF_CLOSING_TAG_PATTERN = /^\s*<[^>]*\/>\s*/u;
const SUBAGENT_TOOL_NAMES = new Set(["Agent", "AgentSwarm"]);

// Resolve a synthesized Kimi child provider session id to the absolute
// `agents/agent-<n>/wire.jsonl` path inside the native session store.
// `sessionsRoot` is the CLI session store directory
// (`.../sessions/<wd_*>/<sessionId>`) that holds `agents/` and `state.json`.
// Returns null when the child cannot be attributed yet (wire not created,
// ambiguous store) — the caller retries on the next poll.
export function resolveKimiSubagentWirePath(
  childProviderSessionId: string,
  sessionsRoot: string
): string | null {
  if (!childProviderSessionId.startsWith(CHILD_ID_PREFIX)) {
    return null;
  }
  const rest = childProviderSessionId.slice(CHILD_ID_PREFIX.length);
  const swarmMember = SWARM_MEMBER_SUFFIX_PATTERN.exec(rest);
  if (swarmMember) {
    return existingWire(sessionsRoot, `agent-${swarmMember[1]}`);
  }
  const toolCallId = ACP_COUNTER_PREFIX_PATTERN.test(rest)
    ? rest.slice(rest.indexOf(":") + 1)
    : rest;
  const spawnPrompt = toolCallId
    ? readSpawnPrompt(sessionsRoot, toolCallId)
    : null;
  if (spawnPrompt) {
    for (const agentId of listSubAgentIds(sessionsRoot)) {
      const wirePath = existingWire(sessionsRoot, agentId);
      if (!wirePath) {
        continue;
      }
      const childPrompt = readFirstDelegatedPrompt(wirePath);
      if (childPrompt?.startsWith(spawnPrompt)) {
        return wirePath;
      }
    }
    return null;
  }
  const subAgentIds = listSubAgentIds(sessionsRoot);
  return subAgentIds.length === 1
    ? existingWire(sessionsRoot, subAgentIds[0])
    : null;
}

function existingWire(sessionsRoot: string, agentId: string): string | null {
  const wirePath = path.join(sessionsRoot, "agents", agentId, "wire.jsonl");
  return existsSync(wirePath) ? wirePath : null;
}

// Sub-agent ids from the session `state.json` agents map (`type: "sub"`),
// numerically ordered; falls back to the `agents/agent-<n>` directory scan
// when the state file is missing or unreadable.
function listSubAgentIds(sessionsRoot: string): string[] {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(path.join(sessionsRoot, "state.json"), "utf8")
    );
    const agents =
      isRecord(parsed) && isRecord(parsed.agents) ? parsed.agents : null;
    if (agents) {
      return Object.entries(agents)
        .filter(
          ([id, value]) =>
            AGENT_DIR_PATTERN.test(id) &&
            isRecord(value) &&
            value.type === "sub"
        )
        .map(([id]) => id)
        .sort(compareAgentIds);
    }
  } catch {
    // Missing/unreadable state.json: fall through to the directory scan.
  }
  try {
    return readdirSync(path.join(sessionsRoot, "agents"))
      .filter((name) => AGENT_DIR_PATTERN.test(name))
      .sort(compareAgentIds);
  } catch {
    return [];
  }
}

function compareAgentIds(a: string, b: string): number {
  return (
    Number(AGENT_DIR_PATTERN.exec(a)?.[1] ?? 0) -
    Number(AGENT_DIR_PATTERN.exec(b)?.[1] ?? 0)
  );
}

// The parent spawn record: the `tool.call` loop event in the main agent's
// wire whose wire-level `toolCallId` matches the child id suffix. Its
// `args.prompt` is the delegated task the child echoes as its first
// `turn.prompt`.
function readSpawnPrompt(
  sessionsRoot: string,
  toolCallId: string
): string | null {
  let source: string;
  try {
    source = readFileSync(
      path.join(sessionsRoot, "agents", "main", "wire.jsonl"),
      "utf8"
    );
  } catch {
    return null;
  }
  for (const line of source.split("\n")) {
    const row = parseLine(line);
    if (!row || row.type !== "context.append_loop_event") {
      continue;
    }
    const event = isRecord(row.event) ? row.event : null;
    if (
      !event ||
      event.type !== "tool.call" ||
      event.toolCallId !== toolCallId ||
      !SUBAGENT_TOOL_NAMES.has(readString(event.name) ?? "")
    ) {
      continue;
    }
    const args = isRecord(event.args) ? event.args : null;
    return readString(args?.prompt);
  }
  return null;
}

// The child's first `turn.prompt` text with CLI context prefixes
// (`<git-context>…</git-context>` and similar leading tags) stripped, so it
// matches the parent spawn prompt verbatim.
function readFirstDelegatedPrompt(wirePath: string): string | null {
  let source: string;
  try {
    source = readFileSync(wirePath, "utf8");
  } catch {
    return null;
  }
  for (const line of source.split("\n")) {
    const row = parseLine(line);
    if (!row || row.type !== "turn.prompt" || !Array.isArray(row.input)) {
      continue;
    }
    const text = row.input
      .map((item) =>
        isRecord(item) && typeof item.text === "string" ? item.text : ""
      )
      .join("\n");
    const stripped = stripLeadingContextTags(text).trim();
    return stripped.length > 0 ? stripped : null;
  }
  return null;
}

function stripLeadingContextTags(text: string): string {
  let current = text;
  for (;;) {
    const withoutBlocks = current.replace(LEADING_TAG_BLOCK_PATTERN, "");
    const withoutTags = withoutBlocks.replace(
      LEADING_SELF_CLOSING_TAG_PATTERN,
      ""
    );
    if (withoutTags === current) {
      return current;
    }
    current = withoutTags;
  }
}

function parseLine(line: string): Record<string, unknown> | null {
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

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
