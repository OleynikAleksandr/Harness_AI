# Session Profiles Retired Bindings Package - 2026-07-05

## Scope

Packaged application rebuild after
`fix(session-profiles): remove retired provider profile bindings`
(`71c093dd`).

The package carries the session-profile cleanup that removes active bindings to
retired provider ids:

- `PROFILE_SUPPORTED_PROVIDER_IDS` contains only live managed-profile targets
  `claude` and `codex`.
- The standard seed set no longer creates `codeai-workflow-kimi` or
  `codeai-workflow-glm-native` selectable profiles.
- Kimi ACP and GLM Native profile material is documented as historical Phase 5
  synthetic-native input, not active profile-store runtime code.

## Commands

```bash
npm run build
npm run package:mac
```

## Result

- `npm run build` passed: typecheck, runtime TypeScript build, and Vite
  renderer build completed.
- `npm run package:mac` passed: no running packaged Harness AI app processes
  were found, build reran, and electron-builder packaged the macOS arm64 app.
- Packaged app exists:
  `release/mac-arm64/Harness AI.app`.
- Packaged `app.asar` exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Local verification timestamp: `2026-07-05 23:33:13 CEST`.

`release/**` remains an untracked local build artifact; this evidence file and
the plan/index updates are the tracked recovery record.
