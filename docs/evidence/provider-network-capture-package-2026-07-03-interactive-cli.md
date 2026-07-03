# Provider Native Request Capture Package Evidence - 2026-07-03 (interactive CLI)

## Scope

Eighth packaged rebuild on 2026-07-03, for the interactive Claude CLI capture
(`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.6). The claude_code
preset dump captured on the previous build proved that the SDK transport can
never produce the CLI reference: the claude binary assembles its system
prompt and inline tool set BY ENTRY MODE (SDK stream-json -> SDK identity +
9 inline tools even with the presets; `-p` print mode -> SDK identity + 26
tools; interactive TTY -> "You are Claude Code, Anthropic's official CLI for
Claude." + 29-30 tools + the agents system message), and no SDK query option
switches that mode. The user goal frame fixed on 2026-07-03: Native = the
provider's ORIGINAL CLI wrapping; derived profiles are edited from that base.

This build carries:

- `13598da4` `feat(claude-provider): capture interactive cli native request` —
  the Claude capture service no longer calls `sdkModule.query`; it drives the
  provider claude binary interactively in a real pty via the new
  `claude-interactive-cli-runner.ts` (system python3 `pty.fork` driver with a
  preflight error when python3 is missing, onboarding/trust pre-acceptance
  written to `.claude.json` only when a prerequisite is missing — the
  provider-home file is a symlink to the user's live Claude config, boot wait
  -> type probe -> submit -> drain -> self-terminate on a timer), and the Core
  capture RPC raises the Claude command timeout to 120s (the pty cycle does
  not fit the 30s proxy default).

## Build

- The packaged rebuild continues the user-directed interactive-CLI pivot
  (chat, 2026-07-03) for the Claude re-capture.
- First `npm run package:mac` run aborted mid-packaging (exit 144 right after
  electron-builder's module scan; `release/mac-arm64` was left half-assembled
  with no `app.asar`). The immediate re-run completed cleanly — recorded here
  because the earlier "bogus exit 144" note assumed the build always
  succeeds; it can also genuinely abort, so always verify `app.asar` exists.
- Second `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 17:35` (30478145 bytes); the bundle contains the interactive
  runner (`claude_interactive_capture_*` markers and the 120s RPC timeout
  verified inside the asar).

## Verification State

- The feature commit passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 75
  static tests including the new runner unit test).
- Pre-packaging smoke runs against a local stub proved the chain piece by
  piece: the provider binary in a pty with the provider-home auth env boots to
  the working interactive input ("Claude Code v2.1.195, Opus 4.8 · Claude
  Max", no login/onboarding/trust prompt — Keychain bridge + shared
  `.claude.json`), and an interactive pty run produces the full CLI request
  (identity "You are Claude Code...", 29 inline tools, agents system message).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`). Expected for Claude: the dump shows the
  interactive CLI system prompt (identity "You are Claude Code, Anthropic's
  official CLI for Claude.", ~1.5k tok vendor-default base plus
  environment-dependent sections for the chosen workspace) and the full
  inline tool set (29-30 tools, ~23k tok, including AskUserQuestion,
  EnterPlanMode/ExitPlanMode, WebFetch, WebSearch, Task*, Cron*, Monitor)
  on the selected model. Completing Claude and Kimi gives the three native
  pairs for Phase R.
