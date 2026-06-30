# Provider CLI Native Update Verification - 2026-06-30

## Scope

- Bug: the Claude CLI "Update" button in Settings ran but the version never
  changed (even after the two-click confirm).

## Root Cause

- The active Claude CLI is the native installer: `~/.local/bin/claude` ->
  `~/.local/share/claude/versions/2.1.195`. The update ran
  `npm install -g @anthropic-ai/claude-code@latest`, which updates a different
  copy under `~/.npm-global`. Because `.local/bin` precedes `.npm-global/bin` in
  PATH, `claude --version` keeps reading the native install, so the version never
  moved. OpenCode CLI has the same split (active `~/.opencode/bin`); Codex CLI
  happened to be the npm copy, so its npm update worked.

## Fix

- CLI update targets now run the provider's own self-update command, which updates
  the active install wherever it lives: `claude update`, `codex update`,
  `opencode upgrade` (new `updateProviderCli` in `core-provider-tools.ts`,
  branched in `core-runtime-api.updateProviderVersion`). SDK targets keep using
  `npm install -g <pkg>@latest`. Core-only change; the renderer button, IPC and
  two-click confirm already worked. Commit
  `Update provider CLIs via their native self-update command`.

## Gate Verification

- Commit passed `.husky/pre-commit`: architecture OK (3 product parts,
  14 clusters, 53 modules), lint OK (275 files), knip OK, typecheck OK,
  tests OK (46).

## Build & Package

- `npm run package:mac` OK; `release/mac-arm64/Harness AI.app` rebuilt at
  Jun 30 10:59.
- Built runtime `core-provider-tools.js` carries `claude update`, `codex update`,
  `opencode upgrade` and `updateProviderCli`; `core-runtime-api.js` imports and
  calls `updateProviderCli`. All present in the packaged `app.asar`.

## Outcome

- Fix is in the packaged app. Relaunch to pick up the new `app.asar`. Pending
  user retest: in Settings, the Claude CLI update (confirm with the second click)
  should now run `claude update` and move the native install to the latest
  version.
