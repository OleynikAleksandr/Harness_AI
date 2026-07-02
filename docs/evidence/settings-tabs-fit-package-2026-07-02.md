# Settings Tabs Fit Package Evidence - 2026-07-02

## User Report (Acceptance Finding)

Screenshot from the packaged app: the Settings tab strip overflowed — nine
fixed-width tabs (104px flex-basis plus 8px gaps) exceeded the 960px
dialog, so the `Profile Creator` tab was cut off at the right edge.

## Change (commit `fix(provider-settings-ui): fit all settings tabs with content-width tabs`)

- `.settings-tab` switched from `flex: 0 0 104px` to content width:
  `flex: 0 1 auto`, `min-width: 64px`, `white-space: nowrap`, horizontal
  padding 14px -> 10px, font 12px -> 11px.
- `.settings-tabs` gap 8px -> 6px.
- All nine tabs now fit inside the 960px dialog with headroom for at least
  one future tab; a longer tail still degrades gracefully through the
  strip's existing `overflow-x: auto`.

## Build

- `npm run package:mac` completed (exit 0 when logged to a file; the
  earlier exit-144 runs were a pipe artifact of the progress output, not a
  build failure).
- `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` rebuilt at
  `2026-07-02 13:11` (30411818 bytes).
- Fix verified inside the package: the bundled renderer CSS hash changed to
  `index-CqbUmuNi.css` and its `.settings-tab` rule carries
  `flex:0 auto; min-width:64px; white-space:nowrap; padding:10px;
  font-size:11px`.

## Retest Expectation

Open Settings in the packaged app: all nine tabs (Claude ... General,
Profile Creator) are visible without horizontal scrolling, with visible
spare room at the right edge.
