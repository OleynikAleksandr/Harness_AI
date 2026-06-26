# Exact CodeAI Settings Surface Verification - 2026-06-26

## Implementation

- Implementation commit: `c1da429 feat: port exact codeai settings surface`
- Rebuilt app: `/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app`
- Rebuilt artifact timestamp: `Jun 26 21:06:27 2026`

## Reference Labels Present In Packaged Renderer

The packaged `app.asar` was extracted to `/tmp/harness-ai-exact-settings-asar`.
The renderer bundle contains the CodeAI Hub Settings General labels:

```text
Response Mode
Glossary protection
Do-not-translate terms
Open glossary file
UI Labels
UI Helper Text
Messages for the User
Artifacts for the User
Text-to-Speech
Provider Native Request Capture
Reset to Defaults
Save Changes
```

## Old Visible Labels Removed From Packaged Renderer

```text
Reset Workspace
Session Continuity:
Harness AI</span>
Default Language</span>
Glossary Enabled
```

No matches were found for these old visible labels in the packaged renderer.

## Commands

```text
npm run quality
OK: architecture, lint, knip, typecheck, tests.
Knip reported existing configuration hints only.

npm run package:mac
OK: build, runtime TypeScript, Vite renderer build, electron-builder mac dir.
```

## Relaunch

The same packaged app path was quit and reopened after the rebuild:

```text
/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app
new process start: Fri Jun 26 21:07:08 2026
```
