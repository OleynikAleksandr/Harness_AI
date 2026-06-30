# Model Card And Button Polish Verification - 2026-06-30

## Scope

Two polish fixes after the typography hierarchy was accepted:

1. Remove the duplicate `model-id` span from provider model cards (the label
   already shows the name, e.g. "Sonnet" / "sonnet").
2. Keep the "Start New Session" button upright (it had inherited the italic from
   its now-italic `.sidebar-section-header` container).

## Changes

- `claude-default-model-card.tsx`, `codex-default-model-card.tsx`,
  `settings-reference-controls.tsx`: removed the `<span className="settings-model-id">`
  line. OpenRouter cards keep their `settings-model-id` span because it carries
  routing/metric text ("default routing", endpoint metrics), not a duplicate
  name. Commit `Remove duplicate model id from provider model cards`.
- `session-window.css`: `.start-new-session-button` now sets `font-style: normal`
  so it does not inherit the slant from `.sidebar-section-header`. Commit
  `Keep the start-new-session button upright`.

## Gate Verification

- Both commits passed `.husky/pre-commit`: architecture OK (3 product parts,
  14 clusters, 53 modules), lint OK (275 files), knip OK, typecheck OK,
  tests OK (46).

## Build & Package

- `npm run package:mac` OK; `release/mac-arm64/Harness AI.app` rebuilt at
  Jun 30 09:54.
- Built renderer CSS shows `.start-new-session-button { ... font-style: normal }`;
  `font-style:normal` is present in the packaged `app.asar`.
- `settings-model-id` now appears 3 times in the built JS bundle — exactly the
  three OpenRouter usages; the Claude, Codex and reference duplicates are gone.

## Outcome

- Both fixes are in the packaged app. Relaunch to pick up the new `app.asar`.
  Pending user retest of the model cards (no duplicate id) and the upright
  Start New Session button (Phase 6 acceptance).
