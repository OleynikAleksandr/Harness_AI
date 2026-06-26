# Working Provider Sessions Evidence - 2026-06-26

## Scope

Verified the Electron desktop app after moving provider execution into the Electron main/Core runtime bridge and registering provider adapters behind the shared adapter contract.

## Checks

- `npm run check:architecture` - OK, 3 product parts, 12 clusters, 49 modules.
- `npm run lint` - OK.
- `npm run typecheck` - OK.
- `npm run test` - OK, 1 runnable test.
- `npm run package:mac` - OK.
- Packaged app startup smoke - OK, no main-process startup output or crash during a 5 second launch.

## Artifact

- `/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app`

## Runtime Notes

- Electron main owns Core runtime and provider adapter registration.
- Renderer talks to Core through `window.harnessCore`.
- Provider choices are backed by registered adapters:
  - Codex: app-server JSON-RPC adapter.
  - Claude, Kimi, GLM OpenCode: adapter-owned CLI session adapters.
  - GLM Native, OpenRouter, Local Models: adapter-owned OpenAI-compatible session adapters.
- Provider availability still depends on each provider's installed CLI, local server, or API key environment.
