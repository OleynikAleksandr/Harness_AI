import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { isKimiAcpRecord } from "./kimi-acp-session-contracts.js";

export interface KimiSessionTokenUsage {
  readonly cached: number;
  readonly limit: number;
  readonly used: number;
}

// Verified native context window of the Coding Plan models (mirrors the CLI
// config `max_context_size`).
const KIMI_NATIVE_CONTEXT_LIMIT = 262_144;

// The CLI sends no live `usage_update` notifications (verified on 0.26.0);
// the durable truth is its session store: the latest `usage.record` row (or
// `step.end` loop event) in the main agent's wire.jsonl under
// `~/.kimi-code/sessions/<wd_*>/<acpSessionId>/agents/main/`. `used` counts
// every input/output component of the last step; `cached` is the
// provider-reported `inputCacheRead`.
export function readKimiSessionTokenUsage(
  acpSessionId: string,
  overrides: { readonly sessionsRoot?: string } = {}
): KimiSessionTokenUsage | null {
  const sessionsRoot =
    overrides.sessionsRoot ?? path.join(homedir(), ".kimi-code", "sessions");
  const wirePath = locateMainWire(sessionsRoot, acpSessionId);
  if (!wirePath) {
    return null;
  }
  try {
    return parseKimiWireUsage(readFileSync(wirePath, "utf8"));
  } catch {
    return null;
  }
}

export function parseKimiWireUsage(
  source: string
): KimiSessionTokenUsage | null {
  let latest: Record<string, unknown> | null = null;
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
    if (!isKimiAcpRecord(row)) {
      continue;
    }
    if (row.type === "usage.record" && isKimiAcpRecord(row.usage)) {
      latest = row.usage;
      continue;
    }
    if (
      row.type === "context.append_loop_event" &&
      isKimiAcpRecord(row.event) &&
      row.event.type === "step.end" &&
      isKimiAcpRecord(row.event.usage)
    ) {
      latest = row.event.usage;
    }
  }
  if (!latest) {
    return null;
  }
  const cached = readCount(latest.inputCacheRead);
  const used =
    readCount(latest.inputOther) +
    readCount(latest.output) +
    readCount(latest.inputCacheCreation) +
    cached;
  return { cached, limit: KIMI_NATIVE_CONTEXT_LIMIT, used };
}

function locateMainWire(
  sessionsRoot: string,
  acpSessionId: string
): string | null {
  let workDirs: string[];
  try {
    workDirs = readdirSync(sessionsRoot);
  } catch {
    return null;
  }
  for (const workDir of workDirs) {
    const candidate = path.join(
      sessionsRoot,
      workDir,
      acpSessionId,
      "agents",
      "main",
      "wire.jsonl"
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function readCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}
