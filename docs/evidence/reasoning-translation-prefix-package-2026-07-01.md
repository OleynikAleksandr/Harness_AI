# Reasoning Translation Prefix Package Evidence - 2026-07-01

## User Report

Translated reasoning blocks in the session dialog disappeared between streamed
updates for providers such as Kimi. Each new translated block eventually
re-rendered with previous blocks, but the visible dialog temporarily cleared the
already translated prefix while newer source text was still pending translation.

## Change

- Core reasoning translation overlays now store the source text for new records.
- The overlay projector keeps the latest translated prefix visible while a
  growing reasoning message waits for the next translation patch.
- The session window preserves a previous Core-provided `localizedContent`
  prefix when the same reasoning message id is updated with more pending source
  text.

## Verification

- Commit `7053b53` passed the implementation gates:
  `plan:validate`, `check:architecture`, `lint`, `check:knip`, `typecheck`,
  and `npm test`.
- `npm run package:mac` passed.
  - The package script stopped stale packaged process `27816`.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
    at `2026-07-01T06:16:37Z`.
