# Reference Provider Module Migration Evidence - 2026-06-28

## Scope

Migrated provider runtime behavior provider-by-provider from CodeAI-Hub into Harness provider modules:

- Claude Agent SDK provider.
- Codex AppServer provider.
- Kimi ACP provider.
- GLM Native provider.
- GLM OpenCode provider.
- OpenRouter provider.
- Local Models provider.

Harness facades bind workspace paths, settings/auth snapshots and runtime homes; provider behavior lives in embedded reference modules under each provider `src/reference/**`.

## Verification

- `npm run check:architecture` - OK.
- `npm run lint` - OK.
- `npm run check:knip` - OK, with existing configuration hints only.
- `npm run typecheck` - OK.
- `npm test` - OK, 24 tests.
- `npm run check:dup` - OK after excluding embedded `**/src/reference/**` upstream reference sources from duplication accounting.
- `npm run check:security` - OK, 0 high production vulnerabilities.
- `npm run check:links` - OK.
- `npm run build` - OK.
- `npm run package:mac` - OK.

## Packaged App

Verified packaged app exists:

`release/mac-arm64/Harness AI.app`

Important packaged files observed:

- `release/mac-arm64/Harness AI.app/Contents/MacOS/Harness AI`
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `release/mac-arm64/Harness AI.app/Contents/Info.plist`
