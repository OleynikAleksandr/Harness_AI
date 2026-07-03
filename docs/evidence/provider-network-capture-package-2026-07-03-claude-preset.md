# Provider Native Request Capture Package Evidence - 2026-07-03 (Claude native preset)

## Scope

Seventh packaged rebuild on 2026-07-03, for the Claude native-preset capture
fix (`.harness/plans/todo-plan.md`, plan
`session-profiles-v2-plan-document-2026-07-02`, Phase 6.5). The first Claude
forward capture recorded only the minimal Agent SDK default (9 tools + a
146-char SDK system prompt, `cc_entrypoint=sdk-ts`), not the full Claude Code
CLI reference — because the capture service ran the SDK `query()` with no
`systemPrompt`/`tools`/`settingSources`, so the SDK used its minimal defaults.

The live Claude adapter's Native profile (`applyClaudeSessionProfile`, kind
`native`) already applies the claude_code presets
(`systemPrompt: {type:"preset", preset:"claude_code"}`, `tools: {type:"preset",
preset:"claude_code"}`, `settingSources: ["user","project","local"]`) —
verified against the installed SDK's `sdk.d.ts` (preset = "Use Claude Code's
default system prompt" / "Use all default Claude Code tools"). So the Native
baseline sends the full Claude Code CLI, but capture did not reflect it.

This build carries:

- `bebb359f` `fix(claude-provider): capture the native claude_code preset
  request` — the Claude capture service now calls
  `applyClaudeSessionProfile(queryOptions, { kind: "native" })` in
  `buildQueryOptions`, the same code path as the live Native adapter, so the
  captured request is the full Claude Code system prompt + native tool set
  (Read/Write/Edit/Bash/Glob/Grep/WebFetch/WebSearch/TodoWrite/...).

## Build

- User confirmed the package build in chat (2026-07-03).
- `npm run package:mac` passed (typecheck, runtime build, Vite renderer
  build, electron-builder for `darwin/arm64`, unsigned by configuration).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-03 16:14` (30471802 bytes).

## Verification State

- The fix commit passed the commit gates (`plan:validate`, Ultracite,
  `check:architecture`, `lint`, `check:knip`, `typecheck`, `npm test` — 74
  static tests).
- User re-capture in the packaged app is the next plan task
  (`harness-ai.phase6.stream1.task2`). Expected for Claude: the dump now shows
  the full Claude Code CLI system prompt and native tool set, including
  WebFetch/WebSearch/Glob/Grep/TodoWrite, on the selected model. SDK note: in
  native builds search may go via Bash `find`/`grep` instead of dedicated
  `Grep`/`Glob` — if those are absent as standalone tools that is expected.
  Completing Claude and Kimi gives the three native pairs for Phase R.
