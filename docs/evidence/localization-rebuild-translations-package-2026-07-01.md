# Rebuild Translations Package Evidence - 2026-07-01

## User Report

After confirming the "Open glossary file" fix, the user enabled translation,
edited the glossary to protect a few mistranslated terms, saved it, and asked
how to make the running translation reflect the updated glossary.

## Root Cause

`LocalizationMaterializer`'s two disk cache layers
(`Localization/cache/browser-runtime-bootstrap.json` and
`Localization/catalogs/<category>/<language>.json`) key on
`settings`/`sourceFingerprint`/`engineId` only. Glossary content is loaded
fresh on every materialization call but is never part of the cache key, so an
edited glossary file never invalidates an already-cached translated bundle.

## Change

- User-directed UI decision: add a second button, "Rebuild translations",
  next to "Open glossary file" in the same row, to force a full retranslation
  on demand regardless of cache state.
- `LocalizationMaterializer.materializeRuntimePayload`/`materializeBundle`,
  `LocalizationRuntimeFacade.materializeRuntimePayload`, and
  `materializeCoreLocalizationRuntimePayload` now accept an optional `force`
  flag that skips the cache reads for one pass (still writing the fresh
  result to cache afterward, so subsequent calls hit the refreshed cache).
- New Core RPC `rebuild-localization` (`core-localization-rebuild-rpc.ts`)
  calls materialization with `force: true` for the active workspace and
  returns `{ ok: true } | { error, ok: false }`; forwarded end to end through
  `IPC_TO_RPC`, `preload.cjs`, and `window.harnessCore.rebuildLocalization()`.
- The Settings "Rebuild translations" button calls the new bridge method,
  then calls the existing localization runtime refresh callback so the
  running app picks up fresh translations without a restart, with a spinner
  and status feedback matching the Restart App row's convention.

## Related Refactor (User-Directed)

While adding the `rebuild-localization` RPC, `core-runtime-api.ts` was
already at 499/500 lines from the prior `ensure-glossary-file` addition. Per
user direction, provider adapter registration and provider readiness event
publishing were split out of `CoreRuntimeApi` into a new `CoreProviderLifecycle`
class (`core-provider-lifecycle.ts`) and a plain
`registerProviderAdapterInstance()` function
(`core-provider-adapter-registration.ts`), shrinking `core-runtime-api.ts`
from 499 to 369 lines before the new RPC was added.

## Verification

- Commits `9feff52`, `adddc70`, `21a19c9`, `5b4b0b3`, `d95707b` each passed
  the implementation gates: `plan:validate`, `check:architecture`, `lint`,
  `check:knip`, `typecheck`, and `npm test`.
- `npm run package:mac` passed.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was
    rebuilt at `2026-07-01T18:23:06Z`.
