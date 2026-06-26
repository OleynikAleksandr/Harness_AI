# Local Models And OpenCode Settings Verification - 2026-06-26

## Implementation

- Implementation commit: `be51274 feat: align codeai settings local models and opencode`
- Rebuilt app: `/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app`

## Changes Verified

- Removed `Text-to-Speech` and `Provider Native Request Capture` from General Settings.
- Local Models Settings now lists LM Studio models discovered from `http://127.0.0.1:1234/v1/models`.
- Local Models uses CodeAI-style model rows and stores the selected LM Studio model key.
- OpenCode Settings now uses a single CodeAI-style `OpenCode` card with reasoning display sync, optional Z.AI API key, config path, default model rows, and isolated-home note.
- OpenCode Versions now includes OpenCode CLI and OpenCode SDK rows without manual update actions.

## Packaged Renderer Evidence

The packaged `app.asar` was extracted to `/tmp/harness-ai-local-opencode-asar`.

Present in packaged app:

```text
Local Models
lmstudio:
No downloaded LM Studio models are currently visible to Core.
Optional Z.AI API key
OpenCode SDK
@opencode-ai/sdk
/v1/models
Reasoning in dialog
```

Removed from packaged app:

```text
Text-to-Speech
Provider Native Request Capture
Speech speed
Enable request capture launcher
```

## Commands

```text
npm run check:architecture
npm run lint
npm run check:knip
npm run typecheck
npm test
npm run build
npm run package:mac
```

All commands completed successfully. `check:knip` reported existing configuration hints only.
