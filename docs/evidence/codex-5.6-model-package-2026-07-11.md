# Codex 5.6 Model Package — 2026-07-11

## Authorization

The user explicitly requested a new packaged build after accepting the Codex
5.6 model catalog and Native Request Capture reasoning changes.

## Build

- Command: `npm run package:mac`.
- Result: passed.
- Electron: 42.5.0.
- Target: macOS arm64 directory package.
- Signing: intentionally skipped (`identity` is `null`).
- Output: `release/mac-arm64/Harness AI.app`.
- The packaging command stopped the previous packaged Harness AI process before
  rebuilding, then ran typecheck, runtime compilation, renderer compilation,
  native dependency installation, and electron-builder packaging.

## Artifact verification

- Executable exists and is a Mach-O 64-bit arm64 binary.
- `Contents/Resources/app.asar` exists.
- `app.asar` size: 30,488,137 bytes.
- `app.asar` timestamp: `2026-07-11T08:22:38+0200`.
- `app.asar` SHA-256:
  `258f7a230aa057510a84586b696c56653e20799c205f0fcfd40c33adc9417df0`.

The archive was read with `@electron/asar` and verified directly:

- Renderer bundle contains `gpt-5.6-sol`, `gpt-5.6-terra`,
  `gpt-5.6-luna`, and the `Ultra` label.
- Packaged settings normalization contains the three GPT-5.6 ids and the
  Sol/Terra `ultra` effort capability.
- Packaged provider descriptor contains the updated Codex Native Request
  Capture catalog.
- Packaged `core-native-capture-rpc.js` contains the Core-owned reasoning
  resolution/propagation path for the dedicated diagnostic adapter.

## Launch smoke check

The freshly packaged application was launched by absolute bundle path. The
packaged executable started successfully and remained running:

`release/mac-arm64/Harness AI.app/Contents/MacOS/Harness AI`

The app is ready for the user's visual Settings and Native Request Capture
acceptance check.
