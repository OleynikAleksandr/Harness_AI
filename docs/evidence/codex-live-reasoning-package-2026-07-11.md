# Codex Live Reasoning Package - 2026-07-11

## Reported Failure

A fresh packaged GPT-5.6 Sol session displayed the workspace-selected `ultra`
effort, but its Codex rollout `turn_context` recorded `reasoning_effort:
"high"` and `effort: "high"`.

The workspace settings were correct. Core built provider-neutral turn options
with `model` and `reasoningEffort`, but the Codex app-server adapter read only
the legacy nested applied-config envelope. With no nested value and no adapter
default, app-server fell back to provider-home `model_reasoning_effort =
"high"`.

## Repair

The Codex adapter now resolves live turn settings in this order:

1. provider-neutral Core `turnOptions.model` / `turnOptions.reasoningEffort`;
2. legacy `__codeaiAppliedTurnConfig` values;
3. adapter workspace/provider-home defaults.

The resolved values are sent as `turn/start.model` and `turn/start.effort`.
For the reported session shape, GPT-5.6 Sol `ultra` therefore reaches the live
app-server turn instead of falling back to `high`.

## Verification

- Focused Codex adapter contract test: passed.
- Focused Core provider-turn-options contract test: passed.
- Typecheck: passed.
- Architecture check: `3` product parts, `16` clusters, `53` modules.
- Full suite: `78` test groups passed.
- Duplication checks: completed successfully.
- Production security audit: `0` vulnerabilities.
- Documentation link check: passed.
- The package was rebuilt after removing generated `dist/`.

## Package Inspection

- App: `release/mac-arm64/Harness AI.app`
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- Archive timestamp: `2026-07-11 11:29:57 CEST`
- Archive size: `29,877,188` bytes
- SHA-256:
  `7527c108746133e99545f1a5e9720d001ff04f7947bfcc2073049a2e6272af0f`
- The compiled `codex-app-server-facade.js` was extracted directly from
  `app.asar`. Inspection confirmed that direct `turnOptions.reasoningEffort`
  precedes legacy `appliedConfig.reasoningEffort` and the resolved value is
  assigned to `effort` in `turn/start`.
- Packaged-app launch smoke: passed; the main process was observed as PID
  `94499` at verification time.

## User Retest

Create a fresh GPT-5.6 Sol session with `ultra`, send one message, and inspect
the new rollout `turn_context`. Both `collaboration_mode.settings.reasoning_effort`
and top-level `effort` should be `ultra`.
