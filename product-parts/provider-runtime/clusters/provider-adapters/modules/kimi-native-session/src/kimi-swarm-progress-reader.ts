import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { isKimiAcpRecord } from "./kimi-acp-session-contracts.js";
import type { KimiLiveSwarmAgent } from "./kimi-subagent-normalizer.js";

// Live swarm truth exists only in the CLI session store: the ACP stream is
// silent while a swarm executes (verified 2026-07-17), but every launched
// agent gets `agents/agent-<n>/wire.jsonl` whose first `turn.prompt` row
// carries the delegated prompt. Polling this store is the only live progress
// source. Deliberately no terminal detection: an agent wire has no reliable
// terminal row (a follow-up `turn.prompt` revives a finished-looking agent),
// so terminal statuses stay with the swarm result.
const AGENT_DIR_PATTERN = /^agent-(\d+)$/u;
const MAX_PROMPT_CHARS = 500;
const LEADING_TAGS_PATTERN = /^\s*(?:<[^>]*>\s*)+/u;

export function readKimiSwarmAgents(
  acpSessionId: string,
  overrides: { readonly sessionsRoot?: string } = {}
): KimiLiveSwarmAgent[] {
  const sessionsRoot =
    overrides.sessionsRoot ?? path.join(homedir(), ".kimi-code", "sessions");
  for (const workDir of listDir(sessionsRoot)) {
    const agentsDir = path.join(sessionsRoot, workDir, acpSessionId, "agents");
    const agentIds = listDir(agentsDir)
      .map((name) => AGENT_DIR_PATTERN.exec(name))
      .filter((match): match is RegExpExecArray => match !== null)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .map((match) => match[0]);
    if (agentIds.length === 0) {
      continue;
    }
    return agentIds.map((agentId) => ({
      agentId,
      prompt: readDelegatedPrompt(path.join(agentsDir, agentId, "wire.jsonl")),
    }));
  }
  return [];
}

function listDir(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}

function readDelegatedPrompt(wirePath: string): string | null {
  let source: string;
  try {
    source = readFileSync(wirePath, "utf8");
  } catch {
    return null;
  }
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let row: unknown;
    try {
      row = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!(isKimiAcpRecord(row) && row.type === "turn.prompt")) {
      continue;
    }
    const text = readPromptText(row.input);
    return text ? text.slice(0, MAX_PROMPT_CHARS) : null;
  }
  return null;
}

// The delegated prompt may be prefixed by CLI context tags (for example the
// `<git-context .../>` header); strip them so the child card shows the task.
function readPromptText(input: unknown): string | null {
  if (!Array.isArray(input)) {
    return null;
  }
  const text = input
    .map((item) =>
      isKimiAcpRecord(item) && typeof item.text === "string" ? item.text : ""
    )
    .join("\n")
    .replace(LEADING_TAGS_PATTERN, "")
    .trim();
  return text.length > 0 ? text : null;
}
