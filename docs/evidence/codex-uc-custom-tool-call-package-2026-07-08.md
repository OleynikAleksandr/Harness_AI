# CodexUC Custom Tool Call Package - 2026-07-08

## Scope

- Package build after `9e849979 fix(codex-uc): execute native custom tool calls`.
- Target: packaged macOS app for user retest of CodexUC synthetic-native benchmark sessions.
- Acceptance focus: native Responses `custom_tool_call` items and streamed
  `response.custom_tool_call_input.*` events must not stop the CodexUC tool
  loop. Freeform native `apply_patch` input is normalized for the local
  executor, the result is returned as `function_call_output`, and the next model
  request continues automatically.

## Verification

- Ran `npm run package:mac`.
- The package script stopped the old packaged app process, ran `npm run build`,
  and completed `typecheck`, `build:runtime`, `vite build`, and
  `electron-builder --mac dir --publish never`.
- Build succeeded.
- Packaged app exists at `release/mac-arm64/Harness AI.app`.
- App bundle contains `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Verified `app.asar` timestamp: `Jul 8 11:25:37 2026`.

## Code And Test Baseline

- Code commit included in this package: `9e849979 fix(codex-uc): execute native custom tool calls`.
- The implementation commit hook passed `check:architecture`, `lint`,
  `check:knip`, `typecheck`, and full `npm test` with 81 tests.
- The package build ran the build-time typecheck again before creating the app bundle.

## Retest Notes

- Start a new packaged-app CodexUC benchmark session with the CodexUC
  synthetic-native profile.
- Ask the benchmark implementation task to continue through file-writing work.
- Expected result: when the backend emits a native `custom_tool_call` for
  `apply_patch`, CodexUC executes the local tool, appends `function_call_output`
  for the same `call_id`, and continues the turn without manual nudging.
