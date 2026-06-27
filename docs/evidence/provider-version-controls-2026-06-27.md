# Provider Version Controls Verification - 2026-06-27

## Scope

- Fixed provider version detection for Claude, Codex, and OpenCode.
- Verified manual update package targets without changing global packages.
- Built the packaged macOS app.

## Detected Versions

```json
{
  "claude": {
    "cli": {
      "currentVersion": "2.1.193",
      "latestVersion": "2.1.195",
      "packageName": "@anthropic-ai/claude-code"
    },
    "sdk": {
      "currentVersion": "0.3.187",
      "latestVersion": "0.3.195",
      "packageName": "@anthropic-ai/claude-agent-sdk"
    }
  },
  "codex": {
    "cli": {
      "currentVersion": "0.142.0",
      "latestVersion": "0.142.3",
      "packageName": "@openai/codex"
    },
    "sdk": {
      "currentVersion": "0.142.0",
      "latestVersion": "0.142.3",
      "packageName": "@openai/codex-sdk"
    }
  },
  "glmOpenCode": {
    "cli": {
      "currentVersion": "1.17.7",
      "latestVersion": "1.17.11",
      "packageName": "opencode-ai"
    },
    "sdk": {
      "currentVersion": null,
      "latestVersion": "1.17.11",
      "packageName": "@opencode-ai/sdk"
    }
  }
}
```

## Update Path

Dry-run command:

```bash
npm install -g @anthropic-ai/claude-code@latest @anthropic-ai/claude-agent-sdk@latest @openai/codex@latest @openai/codex-sdk@latest opencode-ai@latest @opencode-ai/sdk@latest --dry-run
```

Result: command completed successfully and resolved all six package targets. No live global package install was performed.

## Checks

- `npm run fix`
- `npm run check:architecture`
- `npm run lint`
- `npm run check:knip`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run package:mac`
- `npm run check:security`
- `npm run check:links`
- `npm run check:dup`
- `test -d "release/mac-arm64/Harness AI.app"`

## Notes

- CLI current versions are read from the actual provider commands on PATH.
- SDK current versions are read from global npm package state.
- Latest versions are read from npm package metadata.
- OpenCode CLI uses the `opencode-ai` npm package.
