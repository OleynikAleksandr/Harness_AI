# Codex Node Launch Verification - 2026-06-26

## Symptom

Codex provider still failed from the packaged app:

`Provider setup needed: codex CLI is not ready: exit 127: env: node: No such file or directory`

## Root Cause

`/Users/oleksandroliinyk/.npm-global/bin/codex` is a Node shebang script:

`#!/usr/bin/env node`

The previous PATH fix was not sufficient for the packaged app path. Harness AI
now bypasses the shebang for Codex and starts:

`/usr/local/bin/node /Users/oleksandroliinyk/.npm-global/bin/codex ...`

Claude, Kimi, and OpenCode are native/Bun binaries on this machine, so they keep
the normal executable path.

## Verification

- `env -i HOME="$HOME" USER="$USER" /usr/local/bin/node "$HOME/.npm-global/bin/codex" --version` - OK, `codex-cli 0.142.0`
- `npm run package:mac` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm test` - OK
- `npm run check:links` - OK
- `npm run check:dup` - skipped by existing gate until implementation code exists

ASAR extraction confirmed the packaged runner includes the direct Codex Node
launch path.
