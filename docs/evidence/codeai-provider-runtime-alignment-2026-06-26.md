# CodeAI Provider Runtime Alignment Evidence - 2026-06-26

## Scope

Verified the Harness AI alignment away from the direct provider runner and toward the CodeAI Hub-style Core/provider adapter path.

## Checks

- `npm run check:architecture` - OK, 3 product parts, 12 clusters, 49 modules.
- `npm run lint` - OK.
- `npm run typecheck` - OK.
- `npm run test` - OK, 1 runnable test.
- `npm run package:mac` - OK.

## Package Artifact

- Unsigned local macOS app rebuilt at `release/mac-arm64/Harness AI.app`.

## Runtime Notes

- Application Shell no longer exposes `harnessProviders.runTurn`.
- Packaged file list no longer includes `provider-turn-runner`.
- Session UI sends user intent into Core session dispatch and shows the expected adapter-pending message until provider adapters are wired into Core.
- Codex provider module now uses an app-server JSON-RPC shell instead of `codex exec`.
