# Provider Session Picker Evidence - 2026-06-26

## CLI Gates

- `npm run plan:validate` -> OK
- `npm run check:architecture` -> OK
- `npm run lint` -> OK
- `npm run build` -> OK
- `npm test` -> no runnable tests yet
- `npm run check:links` -> OK
- `npm run check:dup` -> skipped until implementation code exists
- `npm run package:mac` -> OK

## UI Flow

Local renderer URL: `http://127.0.0.1:5173/`

Provider picker opened from the New Session button and showed all seven MVP providers:

```json
[
  "Claude",
  "Codex",
  "Kimi",
  "GLM Native",
  "GLM OpenCode",
  "OpenRouter",
  "Local Models"
]
```

Default settings models shown:

```json
[
  "claude-default",
  "codex-default",
  "kimi-default",
  "glm-native-default",
  "glm-opencode-default",
  "openrouter-default",
  "local-model-default"
]
```

Selecting Claude created a new active session:

```json
{
  "headerTitle": "Claude session",
  "sessionTitles": ["Claude session", "Harness AI bootstrap"],
  "telemetry": ["Claude", "claude-default", "Pending first provider turn", "Needs settings"]
}
```

Sending a message in that selected provider session appended the user message and provider-selected placeholder reply.

## Artifact

Updated local unsigned app:

`release/mac-arm64/Harness AI.app`
