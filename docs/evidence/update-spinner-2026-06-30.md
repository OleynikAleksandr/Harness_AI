# Provider Update Spinner Verification - 2026-06-30

## Scope

- User asked for a spinner while a manual provider update runs (until the current
  version refreshes), for every provider with manual updates.

## Change

- `provider-version-controls.tsx`: the shared `ProviderVersionsCard` update button
  now renders a `settings-spinner` next to the "Updating to ..." label while a
  target is updating (driven by the existing `updatingTargets` state), so the
  spinner shows until the update finishes and the current version refreshes. One
  shared component, so Claude, Codex and OpenCode version cards all get it.
  Reuses the existing `.settings-spinner` style. Commit
  `Show a spinner on provider update buttons while updating`.

## Gate Verification

- Commit passed `.husky/pre-commit`: architecture OK (3 product parts,
  14 clusters, 53 modules), lint OK (275 files), knip OK, typecheck OK,
  tests OK (46).

## Build & Package

- `npm run package:mac` OK; `release/mac-arm64/Harness AI.app` rebuilt at
  Jun 30 11:49.
- `settings-spinner` now appears 2 times in the built renderer JS (Core Controls
  restart plus the version update button) and is present in the packaged
  `app.asar`.

## Outcome

- Spinner is in the packaged app. Relaunch to pick up the new `app.asar` (this is
  a renderer change, so no Core reset is needed). Pending user retest: trigger a
  CLI/SDK update and confirm the spinner shows while updating and clears once the
  current version refreshes.
