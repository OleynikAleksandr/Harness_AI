# Local App Packaging Evidence - 2026-06-26

## Command

`npm run package:mac`

Result: OK.

## Artifact

- App path: `release/mac-arm64/Harness AI.app`
- Artifact type: unsigned local macOS `.app` directory
- Code signing: skipped intentionally with `identity: null`
- Apple Developer Account: not required for this local build

## Build Output Summary

- `npm run build` completed before packaging.
- Vite renderer output:
  - `dist/renderer/index.html`
  - `dist/renderer/assets/index-*.css`
  - `dist/renderer/assets/index-*.js`
- electron-builder packaged `darwin arm64` into `release/mac-arm64`.

## Known Nonblocking Packaging Debt

- Default Electron icon is still used.
- Notarization/distribution signing is post-MVP.
