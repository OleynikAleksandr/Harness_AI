# Provider Native Request Capture Package Evidence - 2026-07-03 (extraction fixes)

## Scope

Tenth packaged rebuild on 2026-07-03, for two capture extraction fixes found
when the user re-captured all three pairs on the 18:26 build
(`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.8). Claude was correct
(cli identity, 10 inline tools + deferred catalog, probe). Two defects
remained:

1. **Kimi markdown lost the system section.** The capture worked (Summary
   `POST api.kimi.com:443/coding/v1/chat/completions`, JSONL body had system
   "You are Kimi Code CLI..." ~6.8k tok + 23 native tools + probe), but the
   markdown `## Extracted System Prompt` rendered `null` — the extractor only
   read top-level `body.system`/`instructions`, while Kimi (OpenAI chat shape)
   puts the system prompt in `messages[role=system]`.
2. **Codex captured the prewarm, not the probe turn.** The captured WS
   `response.create` was the background `memory_consolidation` turn (model
   `gpt-5.4-mini`, system "Memory Writing Agent", `tools: []`), not the probe
   turn (`gpt-5.5`, 17 tools). The memory-consolidation turn consolidates our
   probe session, so the probe prompt leaked into its `input` and the
   `bodyIncludes: probe` filter matched the prewarm frame (which arrived
   first). The true Codex system prompt still landed via the rollout
   `base_instructions` (~5.4k tok), but tool schemas were missing.

This build carries:

- `22c2b77a` `fix(capture-artifacts): extract kimi system message` — when the
  body has no top-level `system`/`instructions`, `extractCaptureSections`
  takes the first `role: "system"` chat message's content as the system
  section (the messages section still keeps the full array). Verified against
  the real Kimi dump: the system section now extracts 27127 chars.
- `92deeb10` `fix(capture-proxy): select codex probe frame by tool count` — the
  WS capture gains an optional `minimumTools` threaded from the rule's
  `minimumToolCount`; a `response.create` frame whose top-level `tools` array
  is shorter is skipped. The Codex default rule sets `minimumToolCount: 1`, so
  the prewarm frame (`tools: []`) is skipped even though it contains the probe
  text, and the probe turn (17 tools) is captured.

## Build

- `npm run package:mac` for `darwin/arm64`, unsigned by configuration.
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` rebuilt for
  this scope.

## Verification State

- Both fix commits passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 76
  static tests, incl. the Kimi extraction test and the Codex tool-count WS
  filter test where a prewarm frame that CONTAINS the probe text but has no
  tools is skipped in favor of the probe frame).
- The Kimi extractor fix was verified against the real captured dump
  (`2026-07-03T16-33-52` kimi): the system section now yields the full
  "You are Kimi Code CLI..." prompt (27127 chars) + 23 tools.
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`). Expected: Kimi markdown now shows the
  system prompt; Codex captures the probe turn (`gpt-5.5`, 17 tools) instead
  of the memory-consolidation prewarm. Completing all three delivers the
  native pairs for Phase R.
