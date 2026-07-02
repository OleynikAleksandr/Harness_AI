# Claude Native Setting Sources Package Evidence - 2026-07-02

## User Report (Acceptance Finding)

Testing the packaged app in `/Users/oleksandroliinyk/VSCODE/Test_png`, the
user observed that a Claude Native session never reads the workspace
`CLAUDE.md`, while a Codex session does read its `AGENTS.md`. Session log:
`.harness/sessions/events/session-claude-bf5cf5e9-da29-4537-b087-db77e6622715.jsonl`
(system context ~18.8k tokens present, no CLAUDE.md content, no read tool
calls).

## Diagnosis

- Every Claude query ran with `settingSources: []` (SDK isolation mode,
  inherited CodeAI Hub policy in `claude-runtime-profile.ts`).
- Installed Claude Agent SDK v0.3.195 documents: "Pass [] to disable
  filesystem settings (SDK isolation mode). Must include 'project' to load
  CLAUDE.md files."
- The native branch of `applyClaudeSessionProfile` switched only
  `systemPrompt`/`tools` to the `claude_code` presets; the preset also
  replaced the legacy inline `AGENTS.md` injection, so Native sessions saw
  neither CLAUDE.md (SDK path disabled) nor AGENTS.md (legacy injection
  replaced).

## Change (commit `fix(claude-provider): restore vendor setting sources for native session profiles`)

- Native now restores the vendor CLI setting sources
  `["user", "project", "local"]` and records them in the applied snapshot
  details; the `user` scope reads the isolated provider home.
- Managed/legacy sessions keep the isolation policy untouched.
- The Native restoration contract (Native returns the channel to
  vendor-default behavior as if launched via the plain vendor CLI; adapter
  deviations are restored or documented as Harness process policy) is
  recorded in `docs/architecture/SessionProfiles.md` and the Claude module
  contract.

## Build

- `npm run package:mac` passed (first run exited 144 on a transient
  electron-builder interruption; the immediate rerun completed cleanly).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` rebuilt at
  `2026-07-02 13:05` (30411811 bytes).
- Fix verified inside the package: `asar extract-file` of
  `claude-profile-application.js` contains `CLAUDE_VENDOR_SETTING_SOURCES`.

## Retest Expectation

A new Claude Native session in a workspace with `CLAUDE.md` must load it
like the vendor CLI does (parent-directory CLAUDE.md files now also apply,
matching vendor behavior). Managed profiles and legacy sessions keep prior
behavior.
