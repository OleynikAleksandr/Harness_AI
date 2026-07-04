# Universal Client GLM Package Evidence - 2026-07-04

## Purpose

Package build for the Phase 3 GLM migration acceptance (plan
`universal-client-2026-07-04`, task `harness-ai.phase3.stream4.task1`).
The user explicitly requested the end-of-phase packaged app build on
2026-07-04 ("В конце фазы собери новое приложение для моих тестов").

The next task is the user's live GLM validation on this packaged build.

## What This Build Carries

New visible GLM path:

- The visible provider id is `glm-client`.
- `glm-client` runs through the Core universal client and the
  provider-owned `glm-client-provider` request builder.
- GLM settings use the typed `providers.glmClient` section, including API key
  and pinned model.
- The Settings GLM tab carries the GLM client API key/model card.
- The legacy `glm-native` provider remains internal.
- Embedded OpenCode runtime support is removed from production runtime:
  `glm-opencode` is no longer a provider id, the `glm-opencode-provider`
  module is deleted, and `@opencode-ai/sdk` is no longer a runtime
  dependency.

## Build

- `npm run package:mac` completed, exit 0.
- `package:stop-old` stopped an existing packaged Harness AI process
  (`96922`) before rebuilding.
- `npm run build` completed inside the package command:
  `typecheck`, `build:runtime`, and Vite renderer production build passed.
- Electron Builder packaged `darwin/arm64` into `release/mac-arm64`.
- `release/mac-arm64/Harness AI.app` exists.
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
  at `2026-07-04 22:13:14` (30286030 bytes).
- macOS code signing was skipped because signing identity is configured as
  null; this remains an unsigned local build.

## Manual Validation Handoff

Restart the packaged app before testing. A running instance keeps executing
the previous `app.asar`.

Manual acceptance should use this app:

`release/mac-arm64/Harness AI.app`
