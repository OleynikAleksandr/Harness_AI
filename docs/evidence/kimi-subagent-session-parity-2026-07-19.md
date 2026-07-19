# Kimi Subagent Session Parity — Planning Evidence (2026-07-19)

## Request

User report 2026-07-19: while running the Kimi provider from the Harness AI
app, the main agent spawned subagents. Subagent session dialogs are deficient
compared with the native agent sessions:

1. No context window, no cache, no turns in the status panel.
2. No reasoning (thinking) display.

Native agent sessions contain everything; we do not transfer it into our
sessions shown in dialogs.

Acceptance follow-up on 2026-07-19 refined the native parity boundary: Kimi
0.27 persists a child's thinking/text content only when that child finishes,
and the native Kimi app likewise shows a running animation rather than a live
child transcript. Live child deltas do exist on the optional Kimi Server
WebSocket transport, but replacing ACP solely for that UI difference is
deferred in favor of the universal-client profile/agent path. Native ACP
acceptance therefore requires an honest running state followed by the complete
child transcript, not behavior the native app itself does not expose.

The same follow-up found a separate main native-session defect: one final ACP
assistant answer was split into several bubbles at the normalizer's 360/900
character batching thresholds. Because each block lacked the shared `live`
marker and was trimmed independently, numbered-list markers such as `1.` and
`8.` could land at the bottom of one bubble while their text started the next.
The corrected contract marks every assistant flush `tag: "live"` and preserves
the exact inter-block whitespace; the existing Core live-message coalescer then
projects the complete turn as one bubble.

## Data Comparison (verified against live files)

Native CLI session store:
`.harness/runtime/providers/kimi/home/.kimi-code/sessions/wd_harness-ai_8e9932d32394/session_0c0f38f0-971a-451e-88ed-52a2a6987040/`

- `agents/main/wire.jsonl` — 403 lines: `context.append_loop_event`
  (`tool.call` / `tool.result` / `content.part` / `step.begin` / `step.end`),
  `llm.request`, `usage.record`, `turn.prompt`, …
- `agents/agent-0..3/wire.jsonl` — full subagent wires. agent-0: 107 loop
  events (16 think content parts, 3 text parts, 28 tool.call, 28 tool.result,
  16 step.begin/end), 16 `usage.record` with `usageScope: "turn"`.
- `state.json` — `agents` map: `main` + `agent-0..3` with
  `homedir` / `type: "sub"` / `parentAgentId`.

Our persisted sessions: `.harness/sessions/events/`

- Main `session-kimi-client-6dac38cc-….jsonl` — 184 `session:message`
  (7 user / 152 thinking / 25 assistant), 152 `session:message_translation`,
  58 `session:telemetry`, 21 `session:turn-state`, 16 `session:subagent-call`.
  Final telemetry: `used: 84468, cached: 82688, limit: 1048576, turnCount: 3`.
- Subagent `session-subagent-*.jsonl` (4 files) — 1 `session:message`
  (terminal result only), 16 `session:telemetry` all stub
  (`tokenUsage {used: 0, cached: 0}`, `turnCount: 0`, `status: "running"`
  forever, limitRows loading until Usage API fills them),
  6 `session:provider-binding`, 4 `session:updated`, 1 `session:created`.
  Zero `session:turn-state`, zero thinking messages.
- Child provider session id format: `kimi-agent-3:tool_FedRCFUgN3bUgTytAtZN4M7j`
  — the numeric prefix before `:tool_` is the swarm agent index, mapping
  directly to `agents/agent-3/wire.jsonl`.

## Root Cause (four broken links)

1. **ACP stream is silent about subagent internals.** The Kimi CLI emits no
   content/thinking/usage notifications for spawned agents (verified on CLI
   0.26.0, comments in `kimi-subagent-normalizer.ts:7-13`). The only durable
   source is the CLI session store: `agents/agent-<n>/wire.jsonl`.
2. **Child event channel is intentionally inert.**
   `kimi-client-provider-facade.ts:224-231` — `subscribe("kimi-agent-*")`
   returns a no-op ("the child has no channel of its own"); `sendMessage`
   throws; `resumeSession` is a no-op. So `adoptProviderSession` subscribes the
   child to nothing: no `dialog_message`, no `turn_started/completed`, no
   `token_usage` can ever reach a child session through the standard
   `routeProviderEvent` pipeline.
3. **Synthesized lifecycle carries only status + terminal result.**
   `KimiSubagentNormalizer` emits only `subagent_control` /
   `subagent_session` / `subagent_status`; `SessionSubagentLifecycle`
   materializes the child session record and one terminal `session:message`
   (`session-subagent-lifecycle.ts:183-195`). Nobody synthesizes
   `dialog_message` / `token_usage` / turn lifecycle for children.
4. **Telemetry is seeded as a stub and never updated.**
   `rememberCreatedSession` seeds `used: 0 / cached: 0 / turnCount: 0`
   (`session-request-handler-facade.ts:351-367`); `publishTurnState` is never
   called for children (status stuck at `running`); the only usage reader
   (`kimi-session-usage-reader.ts:84-108`, `locateMainWire`) is hardcoded to
   `agents/main/wire.jsonl`. `turnCount` increments only on `turn_completed`,
   which never reaches children.

## UI Contract (no UI changes needed for parity)

Verified in `session-window` modules: the subagent dialog uses the same
renderers as main (`DialogPanel`, `ReferenceStatusPanel`, `MessageBubble`).
The only `sessionKind === "subagent"` branches hide the input panel (and with
it the turn timers) and add `SubagentSessionHeader`. Nothing filters reasoning
or status chips by session kind.

If Core publishes for a child sessionId:

- `session:message` with `role: "thinking", tag: "thinking"` → reasoning
  bubbles (merge + translation overlay work as for main);
- `session:message` with `role: "assistant"` → transcript;
- `session:telemetry` with real `tokenUsage {used, cached, limit}` and
  `turnCount` (`resolveProviderTurnCount` accepts a native `turnCount` field)
  → status panel Tokens/Cache/Turns (capabilities already `true` for
  `kimi-client`);
- `session:turn-state` `running`/`idle` → live status, telemetry status
  leaves `running`;

then the subagent dialog reaches parity **without any renderer change**.

Tool-call rendering in the dialog does not exist even for main sessions and
is out of scope.

## Design

Give each synthesized Kimi child a real channel fed by its own wire log.

### New module: `kimi-subagent-wire`

`product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-subagent-wire/`

Facade responsibilities:

- **Resolve** child provider session id → wire path:
  `kimi-agent-<n>:tool_…` → `agents/agent-<n>/wire.jsonl` under the parent
  session's store root; single-Agent calls (`kimi-agent-<toolCallId>`, no
  index prefix) resolve via the session `state.json` agents map / live-agent
  tracking already used by `kimi-swarm-progress-reader`.
- **Incrementally read** (offset-based tailing, poll cadence aligned with the
  existing swarm poller) `context.append_loop_event` and `usage.record`.
- **Normalize** into standard provider events the existing Core pipeline
  already understands:
  - `content.part` (think) → `dialog_message {role: "thinking", tag: "thinking"}`;
  - `content.part` (text) → `dialog_message {role: "assistant"}`;
  - `turn.prompt` → `turn_started`;
  - `usage.record` (`usageScope: "turn"`) → `token_usage` with
    `used = inputOther + output + inputCacheCreation + inputCacheRead`,
    `cached = inputCacheRead` (same formula as `parseKimiWireUsage`),
    plus native `turnCount` = count of turn-scoped usage records;
    each turn-scoped record also closes the turn → `turn_completed`;
  - deterministic message ids (`<childId>:wire:<lineNo>`) so replays are
    idempotent.

### Channel wiring

- `kimi-native-session` driver exposes child subscribe: start tailing the
  resolved agent wire on `subscribe(childId)`, emit normalized events
  addressed to that child, stop after terminal drain.
- `kimi-client-provider-facade.ts` replaces the inert
  `subscribe` / `resumeSession` handling for `kimi-agent-*` ids with
  delegation to the driver. From there the unmodified Core path applies:
  `adoptProviderSession` → `routeProviderEvent(childSessionId, event)` →
  reasoning display → `session:message`; telemetry → `session:telemetry`;
  turn lifecycle → `session:turn-state`.

### Core reconciliation

- Restart replay: on Core restart `bindProviderSession` re-subscribes adopted
  children; the wire tailer re-reads from offset 0. Add idempotent append:
  `session:message` with an id already present in that session's history is
  skipped (deterministic wire ids make this exact).
- Terminal result synthesis: `SessionSubagentLifecycle` skips its synthetic
  result `session:message` when the child transcript already contains an
  assistant message delivered from the wire (the wire's final text part is
  the same report the parent received).

## Non-Goals

- Tool-call messages in the dialog (not rendered even for main).
- Input panel / turn timers in subagent dialogs (read-only by design).
- Provider-scope usage limits (5h/Weekly) already reach child sessions via
  the Kimi Usage API broadcast; no change.
- Other providers: Claude/Codex/Grok children already have live channels
  (see `docs/architecture/SubagentSessions.md`); this scope is Kimi-only.

## Acceptance Criteria

1. While a Kimi subagent runs, Harness shows the honest native running state;
   after Kimi persists the child content at completion, the complete thinking
   and assistant transcript appears and survives app restart.
2. Subagent status panel shows real Tokens (used/limit/%), Cache, and Turns
   from `agents/agent-<n>/wire.jsonl` usage records.
3. Subagent telemetry status leaves `running` and settles to idle when the
   subagent terminates; no duplicate result message.
4. One main native-Kimi assistant turn renders as one dialog message even when
   semantic batching flushes it several times; exact whitespace survives each
   artificial boundary, so numbered-list markers stay attached to their text.
