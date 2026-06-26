# Packaged Renderer Assets Hotfix - 2026-06-26

## Symptom

The packaged app opened a Harness AI window but showed an empty renderer surface.

## Cause

`dist/renderer/index.html` used absolute Vite asset URLs:

- `/assets/index-*.js`
- `/assets/index-*.css`

Inside the packaged Electron `file://.../app.asar/dist/renderer/index.html`
page those URLs resolve from the filesystem root instead of the renderer folder.

## Fix

Set Vite `base` to `./`, so the packaged HTML points to local renderer assets:

- `./assets/index-*.js`
- `./assets/index-*.css`

## Verification

- `npm run package:mac` - OK
- `npm run plan:validate` - OK
- ASAR extraction confirmed packaged HTML contains `./assets/...` paths.
- Remote debugging confirmed the packaged app opens:
  `file:///Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness%20AI.app/Contents/Resources/app.asar/dist/renderer/index.html`

macOS denied terminal screenshot/UI inspection through System Events without
assistive access, so visual confirmation should be done by reopening the app.
