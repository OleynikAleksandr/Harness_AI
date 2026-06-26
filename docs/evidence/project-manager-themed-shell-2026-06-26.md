# Project Manager Themed Shell Verification - 2026-06-26

## Scope

Verified the first Harness AI shell pass after applying the CodeAI Hub Project
Manager dark tokens and replacing the disconnected bootstrap chat with a
provider-session start state.

## UI Changes

- Shell now uses Project Manager token values:
  - `#0f1216`, `#151a20`, `#0f141b`, `#101823`
  - `#26303b`, `#354152`
  - `#e7eaee`, `#a8b0ba`
  - `#42c9a2`, `#5fe3ba`
- First screen now shows a provider-session start action.
- The message input stays disabled until a provider session exists.
- New provider session startup text no longer says provider execution is not connected.

## Commands

- `npm run package:mac` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm test` - OK
- `npm run check:links` - OK
- `npm run check:dup` - skipped by the existing gate until implementation code exists

## Package Artifact

- App path: `release/mac-arm64/Harness AI.app`
- ASAR path: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`

ASAR extraction confirmed packaged HTML still uses relative renderer assets:

- `./assets/index-WAXnhG3U.js`
- `./assets/index-CdM57cU6.css`

Remote debugging confirmed the packaged app opens:

`file:///Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness%20AI.app/Contents/Resources/app.asar/dist/renderer/index.html`
