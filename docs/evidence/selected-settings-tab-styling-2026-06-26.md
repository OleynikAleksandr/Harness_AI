# Selected Settings Tab Styling Evidence - 2026-06-26

## Scope

- Kept hover and selected Settings tabs at the same geometry.
- Made every Settings tab the same width, sized for the longest label in the row.
- Matched selected tab fill to the selected model row blue fill: `rgba(14, 99, 156, 0.28)`.

## Verification

- `npm run plan:validate` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm run package:mac` - OK
- `test -d "release/mac-arm64/Harness AI.app"` - OK
- `rg "flex:0 0 104px|background:#0e639c47|settings-tab\\.active" dist release/mac-arm64/Harness\ AI.app -n` - found the built tab width and selected blue fill in `dist/renderer/assets/index-C0gLK1-G.css`.

## Delivered Artifact

- `release/mac-arm64/Harness AI.app`
