# CodeAI Settings Provider Tabs Verification - 2026-06-26

## Implementation

- Implementation commit: `b8fca3d feat: port codeai settings provider tabs`
- Rebuilt app: `/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app`

## Provider Settings Port

- Settings tab styling was returned to the compact CodeAI Hub scale: 16px header, 12px tabs, blue underline active tab, 14px card titles, and compact radio rows.
- Claude tab now includes CodeAI-style `Claude Default model`, `Claude Versions`, `Claude Thinking Settings`, and `Claude Session Continuity` cards.
- Claude models are normalized to `sonnet`, `opus`, and `haiku`; stale `cli-default` settings are normalized out of the settings store.
- Kimi settings now expose the CodeAI Hub Kimi model registry entries: `Kimi K2.7 Code` and `Kimi K2.7 Code High Speed`.
- Provider version scan/update IPC was added for Claude/Codex CLI and SDK packages.

## Packaged Renderer Evidence

The packaged `app.asar` was extracted to `/tmp/harness-ai-provider-settings-asar`.
The packaged renderer/runtime contains:

```text
Claude Versions
Claude Thinking Settings
Kimi K2.7 Code
Auto-update Claude
@anthropic-ai/claude-code
@anthropic-ai/claude-agent-sdk
@openai/codex
@openai/codex-sdk
sonnet
haiku
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
