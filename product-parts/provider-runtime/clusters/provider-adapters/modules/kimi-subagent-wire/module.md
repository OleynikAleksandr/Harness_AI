# Kimi Subagent Wire Module

## Responsibility

Give a synthesized Kimi child session (`kimi-agent-*`) a real data source.
The Kimi CLI's ACP stream is silent about subagent internals (verified live
2026-07-19, CLI 0.26.0; see
`docs/evidence/kimi-subagent-session-parity-2026-07-19.md`), so the only
durable child truth is the CLI session store: each sub-agent writes its own
`agents/agent-<n>/wire.jsonl` under the native session store directory
(`.../sessions/<wd_*>/<sessionId>`, next to `state.json`). This module
resolves a child provider session id to that wire and tails it
incrementally, normalizing wire rows into the standard provider events the
unmodified Core pipeline already routes (`routeProviderEvent` → reasoning
display, telemetry, turn state).

## Public Facade

`src/kimi-subagent-wire-facade.ts`

- `resolveKimiSubagentWirePath(childProviderSessionId, sessionsRoot)` →
  absolute `agents/agent-<n>/wire.jsonl` path or `null` when the child
  cannot be attributed yet (caller retries on the next poll).
  `sessionsRoot` is the CLI session store directory holding `agents/` and
  `state.json`. Resolution rules (verified against the live store):
  - Swarm member id `kimi-agent-<n>:tool_<suffix>:agent-<k>` — the trailing
    store agent id maps directly to `agents/agent-<k>/wire.jsonl`.
  - Root id `kimi-agent-<n>:tool_<suffix>` (single `Agent` call, swarm
    fallback root) — the ACP toolCallId counter prefix `<n>:` is NOT the
    store agent index (observed `1:tool_…` → `agent-0`, `3:tool_…` →
    `agent-1..3`), so the id resolves by matching the parent spawn
    `tool.call` `args.prompt` in `agents/main/wire.jsonl` against each
    sub-agent's first `turn.prompt` (CLI `<git-context>` tag prefixes
    stripped). When the parent wire cannot explain the id, the session
    `state.json` agents map decides only if it lists exactly one
    `type: "sub"` agent; otherwise `null`.
- `createKimiSubagentWireReader({ childProviderSessionId, wirePath })` →
  `KimiSubagentWireReader` with `readNewEvents(): KimiSubagentWireEvent[]`
  (sync IO, matching the neighboring wire readers). Offset-based tailing:
  each call returns only the events from bytes appended since the previous
  call; a trailing incomplete line stays buffered until its newline
  arrives; a truncated/rotated file restarts from offset 0.

## Outputs

Normalized events (structurally compatible with `NormalizedProviderEvent`,
consumed as `unknown` by the Core router):

- `content.part` think → `dialog_message` `{role: "thinking", tag: "thinking", content}`;
  text → `{role: "assistant", content}`. Empty parts are skipped. Event
  `uuid` is deterministic — `<childProviderSessionId>:wire:<lineNo>` with
  the 1-based wire line number — so a from-offset-0 replay after a Core
  restart re-emits the same ids (Core skips already-persisted message ids).
- `turn.prompt` → `turn_started`.
- `usage.record` with `usageScope: "turn"` → a `token_usage` stream event
  (`used = inputOther + output + inputCacheCreation + inputCacheRead`,
  `cached = inputCacheRead` — the `parseKimiWireUsage` formula; no `limit`
  is emitted, so Core `mergeTokenUsage` keeps the seeded catalog limit)
  followed by `turn_completed`. Both carry the native `turnCount` (running
  count of turn-scoped records), which `resolveProviderTurnCount` prefers
  over its own increment, so the pair never double-counts.
- Timestamps come from the wire row `time` (epoch ms → ISO) and are omitted
  when the row carries none.
- `tool.call` / `tool.result` / `step.begin` / `step.end` and every other
  row type are skipped: the dialog renders no tool calls even for main
  sessions.

## Owned Paths

- `module.md`
- `src/**`
