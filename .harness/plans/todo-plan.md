# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "turn-timer-2026-07-18",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase3.stream3.task3",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** user request 2026-07-19 — Kimi subagent session dialogs
  are deficient versus native agent sessions: no context window / cache /
  turns in the status panel and no reasoning display; native CLI wire logs
  (`agents/agent-<n>/wire.jsonl`) contain everything, our persisted
  `session-subagent-*.jsonl` do not. Fix by ingesting agent wire logs into
  child sessions through a real channel instead of the inert subscription.
- **Planning document:** `docs/evidence/kimi-subagent-session-parity-2026-07-19.md`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **Read this context before implementation:**
  - `docs/evidence/kimi-subagent-session-parity-2026-07-19.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/module.md`
  - `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/module.md`
  - `product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md`
  - `docs/architecture/SubagentSessions.md`

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- A task row is a logical row: it may wrap onto indented continuation lines.
  The orchestrator reads `expected commit:` / `completion:` markers across the
  whole logical row and appends `Result:` records at its end.
- Each microtask touches no more than 3 functional files unless this plan splits it first.
- Product Part / Cluster / Module filesystem ownership is primary.
- CodeAI Hub may be read as reference material, but modules are not copied wholesale.
- Application Shell is UI/supervisor/client only. It is not source of truth for
  workflow, settings, provider state, limits, tokens, reasoning, artifacts or
  orchestration.
- Any source change updates every related Markdown document in the same commit:
  affected `module.md`, `cluster.md`, `product-part.md`, architecture docs,
  product tree docs, README/AGENTS/CLAUDE when relevant, and any related
  `.md` / `.markdown` found through `docs/DOCUMENTATION_INDEX.md`.
- Update `docs/DOCUMENTATION_INDEX.md` whenever tracked Markdown files are
  added, moved or deleted.
- No release/package build starts as a release decision without explicit user confirmation.
- Scope closeout/archival is user-directed only: the agent never initiates moving `Execution Scope Status` to `NONE`, running `npm run plan:archive`, or starting a fresh empty plan — it may only suggest it and wait for the user's direct order.
- A final user-verification task uses `completion: user-acceptance` and
  `expected commit: none`. Explicit positive acceptance is recorded with
  `npm run plan:accept -- "<short acceptance note>"`; this marks only that task
  done, creates its acceptance commit and leaves the scope ACTIVE.
- User acceptance does not authorize `plan:archive`. Archival remains a later,
  separate direct user command; after `plan:accept`, ordinary archival must not
  require `--force`.
- Verification/package builds for the current implementation scope are allowed when the active plan asks for them.
- Quality gates run automatically on every commit (`.husky/pre-commit`) and push (`.husky/pre-push`); plans never include a separate phase or task just to run gates.
- Commit with `npm run plan:commit -- "<expected commit message>"`.

## Phase 1 - Session Turn Timers (owner: Codex, updated: 2026-07-18)

### Stream: Turn Timing Modules

1. [DONE] `harness-ai.phase1.stream1.task1` Record the turn-timer
   planning evidence and catalog it in the documentation index (scope:
   `docs/evidence/turn-timer-planning-2026-07-18.md, docs/DOCUMENTATION_INDEX.md`;
   expected commit: `docs: plan session turn timer and active total`). Result: Completed in commit `docs: plan session turn timer and active total`.
2. [DONE] Git Commit: `docs: plan session turn timer and active total` (hash: self)
3. [DONE] `harness-ai.phase1.stream1.task2` Create the Core `turn-timing`
   module: a facade exposing the pure `deriveTurnTiming(events, sessionId)`
   contract over persisted `session:turn-state` events (closed running→idle
   pairs accumulate `activeMs`; repeated `running` events extend the same
   turn; a trailing unclosed `running` from a previous app run is ignored)
   plus module and ownership docs (scope:
   `product-parts/core-runtime/clusters/session-runtime/modules/turn-timing/src/turn-timing-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/turn-timing/module.md, product-parts/core-runtime/clusters/session-runtime/cluster.md, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`;
   expected commit: `feat: add core turn-timing derivation module`). Result: Completed in commit `feat: add core turn-timing derivation module`.
4. [DONE] Git Commit: `feat: add core turn-timing derivation module` (hash: self)
5. [DONE] `harness-ai.phase1.stream1.task3` Create the `turn-timer` UI module
   in session-interface (after the `input-controls` small-module pattern): a
   facade with `TurnTimer` (input-row timer, rendered only while a turn runs)
   and `SessionTotalTimer` (footer-right sum of completed turns) plus module
   and ownership docs (scope:
   `product-parts/application-shell/clusters/session-interface/modules/turn-timer/src/turn-timer-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/turn-timer/module.md, product-parts/application-shell/clusters/session-interface/cluster.md, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`;
   expected commit: `feat: add session turn-timer UI module`). Result: Completed in commit `feat: add session turn-timer UI module`.
6. [DONE] Git Commit: `feat: add session turn-timer UI module` (hash: self)
7. [DONE] `harness-ai.phase1.stream1.task4` Wire the timers into the session
   window: derive per-session timing from Core events in
   `session-window-facade.tsx` via `deriveTurnTiming`, replace `ElapsedTotal`
   with `SessionTotalTimer`, render `TurnTimer` on the right side of the
   input row while the panel is disabled, add the CSS, and sync the
   session-window module doc (scope:
   `product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md`;
   expected commit: `feat: run session input timers from turn lifecycle`). Result: Completed in commit `feat: run session input timers from turn lifecycle`.
8. [DONE] Git Commit: `feat: run session input timers from turn lifecycle` (hash: self)

## Phase 2 - Package & User Acceptance (owner: Codex + User, updated: 2026-07-18)

### Stream: Package And Retest

9. [DONE] `harness-ai.phase2.stream1.task1` Package the app for user
   verification (`npm run package:mac`, user-confirmed) and record evidence
   (scope: `docs/evidence/**, .harness/plans/todo-plan.md, docs/DOCUMENTATION_INDEX.md`;
   expected commit: `chore: package session turn timer build`). Result: Completed in commit `chore: package session turn timer build`.
10. [DONE] Git Commit: `chore: package session turn timer build` (hash: self)
11. [DONE] `harness-ai.phase2.stream1.task2` User retests the session input
    panel in the packaged app for every provider: sending a message locks the
    input and starts the in-row turn timer; when the turn ends the timer
    disappears and its value folds into the footer Total; Total equals the
    summed active agent work time and no longer counts from session creation
    (completion: user-acceptance; scope: user workflow; expected commit: none). Result: User acceptance recorded — User accepted turn timer: packaged app retest passed for all providers Acceptance Commit: `chore: record plan acceptance turn-timer-2026-07-18`.

## Phase 3 - Kimi Subagent Session Parity (owner: Codex, updated: 2026-07-19)

### Stream: Subagent Wire Ingestion

12. [DONE] `harness-ai.phase3.stream1.task1` Record the Kimi subagent session
    parity planning evidence and catalog it in the documentation index (scope:
    `docs/evidence/kimi-subagent-session-parity-2026-07-19.md, docs/DOCUMENTATION_INDEX.md`;
    expected commit: `docs: plan kimi subagent session parity`). Result: Completed in commit `docs: plan kimi subagent session parity`.
13. [DONE] Git Commit: `docs: plan kimi subagent session parity` (hash: self)
14. [DONE] `harness-ai.phase3.stream1.task2` Create the `kimi-subagent-wire`
    module in provider-adapters: a facade that resolves a child provider
    session id (`kimi-agent-<n>:tool_…`, single-Agent fallback via the
    session `state.json` agents map) to its `agents/agent-<n>/wire.jsonl` and
    incrementally normalizes wire records into standard provider events —
    thinking/assistant `dialog_message` with deterministic wire-offset ids,
    `turn_started`/`turn_completed` from `turn.prompt` / turn-scoped
    `usage.record`, and `token_usage` (`used = inputOther + output +
    inputCacheCreation + inputCacheRead`, `cached = inputCacheRead`, native
    `turnCount`) — plus module and ownership docs (scope:
    `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-subagent-wire/src/kimi-subagent-wire-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-subagent-wire/module.md, product-parts/provider-runtime/clusters/provider-adapters/cluster.md, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md`;
    expected commit: `feat: add kimi subagent wire reader module`). Result: Completed in commit `feat: add kimi subagent wire reader module`.
15. [DONE] Git Commit: `feat: add kimi subagent wire reader module` (hash: self)
16. [DONE] `harness-ai.phase3.stream1.task3` Wire the child channel: the
    `kimi-native-session` driver tails the resolved agent wire for each
    subscribed child and broadcasts child-addressed provider events;
    `kimi-client-provider-facade` delegates `kimi-agent-*` subscribe/resume
    to the driver instead of the inert no-op so the standard
    `routeProviderEvent` pipeline projects messages, telemetry and turn-state
    into child sessions; sync module docs (scope:
    `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-native-session-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-native-session-runtime.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/src/kimi-client-provider-facade.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/module.md, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-client-provider/module.md`;
    expected commit: `feat: stream kimi subagent wire events to child sessions`). Result: Completed in commit `feat: stream kimi subagent wire events to child sessions`.
17. [DONE] Git Commit: `feat: stream kimi subagent wire events to child sessions` (hash: self)
18. [DONE] `harness-ai.phase3.stream1.task4` Core reconciliation: make
    `session:message` appends idempotent by message id in the session event
    stream (restart-safe wire replay with deterministic ids) and skip the
    synthetic terminal result message when the wire already delivered
    assistant content to the child; sync module and architecture docs (scope:
    `product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-subagent-lifecycle.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md, docs/architecture/SubagentSessions.md`;
    expected commit: `feat: dedupe kimi subagent transcript replay`). Result: Completed in commit `feat: dedupe kimi subagent transcript replay`.
19. [DONE] Git Commit: `feat: dedupe kimi subagent transcript replay` (hash: self)

### Stream: Package And Retest

20. [DONE] `harness-ai.phase3.stream2.task1` Package the app for user
    verification (`npm run package:mac`, user-confirmed) and record evidence
    (scope: `docs/evidence/**, .harness/plans/todo-plan.md, docs/DOCUMENTATION_INDEX.md`;
    expected commit: `chore: package kimi subagent parity build`). Result: Completed in commit `chore: package kimi subagent parity build`.
21. [DONE] Git Commit: `chore: package kimi subagent parity build` (hash: self)
### Stream: Packaged Acceptance Defect — Assistant Message Boundaries

22. [DONE] `harness-ai.phase3.stream3.task1` Fix the packaged native
    Kimi acceptance defect where the semantic stream buffer publishes one
    assistant turn as several unrelated dialog messages and trims the exact
    whitespace at those artificial boundaries (for example `1.` and `8.`
    detach from their list text). Mark every flushed assistant block as one
    live stream, preserve its boundary whitespace, and prove the existing
    Core coalescer projects the blocks as one message; sync the module and
    parity evidence (scope:
    `product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-session-event-normalizer.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-native-session-runtime.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-assistant-message-coalescing.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/module.md, docs/evidence/kimi-subagent-session-parity-2026-07-19.md`;
    expected commit: `fix: coalesce kimi native assistant chunks`). Result: Completed in commit `fix: coalesce kimi native assistant chunks`.
23. [DONE] Git Commit: `fix: coalesce kimi native assistant chunks` (hash: self)
24. [DONE] `harness-ai.phase3.stream3.task2` After explicit user confirmation,
    rebuild the macOS package containing the native Kimi assistant-message
    fix and update packaged evidence (scope:
    `docs/evidence/**, .harness/plans/todo-plan.md, docs/DOCUMENTATION_INDEX.md`;
    expected commit: `chore: package kimi assistant message fix`). Result: Completed in commit `chore: package kimi assistant message fix`.
25. [DONE] Git Commit: `chore: package kimi assistant message fix` (hash: self)
26. [IN_PROGRESS] `harness-ai.phase3.stream3.task3` User retests Kimi native and
    subagent session dialogs in the rebuilt app: native-Kimi running state is
    honest, the completed assistant turn renders as one dialog message with
    numbered-list markers attached to their text, the status panel shows real
    context window / cache / turns, telemetry settles to idle, and no
    duplicate result message appears (completion: user-acceptance; scope: user
    workflow; expected commit: none).
