# Localization Coverage And Cache Repair Package Evidence - 2026-06-30

## Scope

This evidence records the packaged application rebuild after the second user
retest found that only a small subset of Settings helper text translated.

## Fixes Included

- Runtime category mapping now follows the visible General selectors:
  - `uiInterface` feeds runtime `ui_labels`.
  - `userGuidance` feeds runtime `ui_helper_text`.
  - `systemFeedback` feeds runtime `messages_for_the_user`.
- Settings shell copy now uses browser localization lookups for the dialog
  title, close/reset/save buttons, loading/resetting/saving messages, and tab
  labels.
- The first provider-settings shell slice is marked for localization:
  Kimi default-model shell, Thinking labels, session continuity titles, and
  OpenRouter translation-profile shell labels.
- Approved source dictionaries include the new Settings shell and provider
  shell message ids.
- Localization cache layout now matches the first reference-project shape:
  translated bundles are stored under
  `Localization/catalogs/<category>/<language>.json`, while browser bootstrap is
  stored under `Localization/cache/browser-runtime-bootstrap.json`.

## Command

```bash
npm run package:mac
```

The command completed successfully on 2026-06-30. It ran:

- `npm run build`
- `npm run typecheck`
- `npm run build:runtime`
- Vite renderer production build
- `electron-builder --mac dir --publish never`

## Output

- Packaged app exists:
  `release/mac-arm64/Harness AI.app`
- Packaged runtime archive exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` size at verification time: 28 MB.
- Electron Builder packaged `darwin` `arm64` output into
  `release/mac-arm64`.
- macOS code signing was skipped because signing identity is explicitly null.

## Build Artifact Check

Artifact grep confirmed:

- `dist/runtime/.../core-localization-runtime.js` maps `ui_labels` from
  `uiInterface`.
- `dist/runtime/.../localization-materializer.js` writes category bundle paths
  under `catalogs`.
- `dist/runtime/.../source-dictionaries.js` includes new Settings shell ids such
  as `settings.tab.openRouter`, `settings.openRouter.profiles`, and
  `settings.provider.kimi.defaultModel`.
- The renderer bundle contains browser-localized Settings shell lookups.

## Verification

- Commit hooks passed after each repair commit.
- Latest test run in hooks: `Tests: OK (56)`.
- Package rebuild: passed.
- Application artifact presence check: passed.

## Retest Target

Use the rebuilt app at:

```text
release/mac-arm64/Harness AI.app
```

Retest focus:

- General tab UI labels, helper text, and messages translate when their visible
  selectors are set to Russian.
- Settings dialog title, provider tab labels, and first provider-settings shell
  labels translate.
- Harness localization cache appears under:
  - `~/.harness-ai/Localization/catalogs/<category>/<language>.json`
  - `~/.harness-ai/Localization/cache/browser-runtime-bootstrap.json`

## Still Incremental

This does not yet mark every provider-specific setting row. Remaining provider
card internals should continue as small marker slices so each commit stays
reviewable.
