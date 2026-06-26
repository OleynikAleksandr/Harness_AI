# Provider Turn Execution Verification - 2026-06-26

## Scope

Verified the real provider turn path added for the MVP chat session:

- provider selection creates a session with provider id and selected model;
- renderer calls the Electron preload bridge;
- Electron main dispatches to Provider Runtime;
- CLI providers use installed local commands;
- HTTP providers use OpenAI-compatible `/chat/completions` with runtime credentials only.

## Commands

- `npm run package:mac` - OK
- `npm run check:links` - OK
- `npm run check:dup` - OK

`npm run package:mac` also ran:

- `npm run build`
- `npm run typecheck`
- `vite build`
- `electron-builder --mac dir --publish never`

## Package Artifact

- App path: `release/mac-arm64/Harness AI.app`
- ASAR path: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`

ASAR content check confirmed:

- `/product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs`
- `/product-parts/provider-runtime/clusters/provider-adapters/modules/provider-turn-runner/src/provider-turn-runner-facade.mjs`

## Provider Runtime Checks

Unit self-checks cover:

- CLI provider success path with `claude --print`.
- HTTP OpenAI-compatible success path with GLM Native settings.
- OpenRouter setup-error path when API key exists but model is not configured.

Local CLI commands are present:

- `/Users/oleksandroliinyk/.local/bin/claude`
- `/Users/oleksandroliinyk/.npm-global/bin/codex`
- `/Users/oleksandroliinyk/.kimi-code/bin/kimi`
- `/Users/oleksandroliinyk/.opencode/bin/opencode`

No live paid provider request was executed during verification. Runtime credentials
stay in the user's home settings or environment variables and are not written to
the Harness AI workspace.
