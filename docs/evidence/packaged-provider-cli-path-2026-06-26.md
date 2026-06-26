# Packaged Provider CLI PATH Verification - 2026-06-26

## Symptom

Codex provider failed from the packaged macOS app:

`Provider setup needed: codex CLI is not ready: exit 127: env: node: No such file or directory`

## Cause

The app launched from Finder has a reduced `PATH`. The Codex launcher exists at
`/Users/oleksandroliinyk/.npm-global/bin/codex`, but its shebang is
`#!/usr/bin/env node`, and `node` is installed at `/usr/local/bin/node`.

## Fix

Provider CLI child processes now receive a deduplicated PATH that includes:

- `/Users/oleksandroliinyk/.npm-global/bin`
- `/Users/oleksandroliinyk/.local/bin`
- `/Users/oleksandroliinyk/.kimi-code/bin`
- `/Users/oleksandroliinyk/.opencode/bin`
- `/opt/homebrew/bin`
- `/usr/local/bin`
- system paths

The fix only changes the child-process environment and does not mutate global
`process.env`.

## Verification

- `npm run package:mac` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm test` - OK
- `npm run check:links` - OK
- `npm run check:dup` - skipped by the existing gate until implementation code exists

ASAR extraction confirmed the packaged provider runner contains the CLI PATH
hotfix.
