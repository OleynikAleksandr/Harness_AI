# Codex Rollback Cache Telemetry Package - 2026-07-06

## Scope

Rebuilt the packaged macOS app after the Codex rollback acceptance fixes:

- Rollback preserves the first two visible Codex user turns as the
  warmup/cache-anchor pair through the Core-owned
  `preserveFirstUserTurns: 2` rollback contract.
- After rollback, Core restores the visible transcript plus `Tokens`/`Cache`
  telemetry to the snapshot captured at the preserved anchor boundary; the next
  user turn updates both counters from fresh provider telemetry.
- `Turns` is displayed next to `Rollback`.
- Provider-reported cached input tokens flow through Core telemetry and render
  as `Cache` beside `Tokens` when available.
- Acceptance layout fix keeps `Turns` immediately to the left of `Rollback`,
  after `Tokens` and optional `Cache`, on the same desktop status-panel row.
- `codex-synthetic-native` is available as a Codex individual session profile:
  it materializes the accepted 2026-07-05 Codex native request capture
  (system prompt + captured tool declarations as prompt-visible reference text)
  plus the current workspace `AGENTS.md` text into the profile prompt. This is a
  manual probe for verifying that Codex receives the instructions even if the
  workspace `AGENTS.md` file is removed after profile selection.

## Commands

```text
npm run build
npm run package:mac
```

`npm run package:mac` found no running packaged Harness AI app processes before
rebuilding.

## Result

```text
release/mac-arm64/Harness AI.app
release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

Verified artifact sizes:

```text
302M  release/mac-arm64/Harness AI.app
29M   release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

Verified artifact timestamp:

```text
2026-07-06 16:16:39 CEST  release/mac-arm64/Harness AI.app
2026-07-06 16:16:39 CEST  release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

## User Retest Checklist

- Start `release/mac-arm64/Harness AI.app`.
- Open a Codex session and confirm the status panel order:
  `Tokens`, optional `Cache`, `Turns`, `Rollback`.
- Confirm `Turns` and `Rollback` stay on the same row at the desktop packaged
  app width shown in the acceptance screenshot.
- Confirm `Rollback` is disabled while `Turns <= 2`.
- After adding dynamic turns, press `Rollback` and confirm the dialog still
  shows the first two user turns and restores `Tokens`/`Cache` to the preserved
  anchor snapshot.
- Confirm `Cache` appears after Codex emits cached input token telemetry.
- In the Codex profile picker, select `Codex Synthetic Native`; start a session,
  then remove workspace `AGENTS.md` for the test and confirm the agent still
  follows the materialized workspace instructions from the profile.
