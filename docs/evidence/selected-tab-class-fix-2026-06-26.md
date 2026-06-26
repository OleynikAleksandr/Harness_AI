# Selected Tab Class Fix Evidence - 2026-06-26

## Scope

- Fixed Settings tab class composition from a merged class name to separate `active settings-tab` classes.
- This makes the selected tab keep the base tab width and apply the selected-model blue fill.

## Root Cause

- The selected tab rendered as `settings-tabactive`, so `.settings-tab` and `.settings-tab.active` did not apply.
- The browser rendered the selected tab as a native button, causing white fill and width changes.

## Verification

- `npm run plan:validate` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg "active settings-tab|settings-tab|flex:0 0 104px|background:#0e639c47" dist release/mac-arm64/Harness\ AI.app -n` - found corrected built class name and selected-tab CSS.

## Delivered Artifact

- `release/mac-arm64/Harness AI.app`
