# Retired Custom Codex Provider Removal Package - 2026-07-11

## Scope

The custom OAuth Responses provider was removed end-to-end while the shared
Universal Client remained available for Kimi, GLM, OpenRouter, and Local
Models. The removal covers provider registration, UI, profile seeds and
applicability, runtime branches, native capture, the complete adapter module,
product-tree projections, and obsolete documentation/evidence.

Local user runtime history under `~/.harness-ai/**` was intentionally not
deleted by this codebase migration.

## Verification

- Architecture check: `3` product parts, `16` clusters, `53` modules.
- Test suite: `78` test groups passed after adapter deletion.
- `npm run check:dup`: completed successfully at both repository and workspace
  levels.
- `npm run check:security`: `0` production vulnerabilities.
- `npm run check:links`: `Link check: OK`.
- `npm run build`: completed successfully.
- The final package was rebuilt from a freshly removed `dist/` directory so
  deleted compiled modules could not survive as stale build output.
- `npm run package:mac`: completed successfully; macOS signing was intentionally
  skipped for the local unsigned package.

## Package Inspection

- App: `release/mac-arm64/Harness AI.app`
- Archive: `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- Archive timestamp: `2026-07-11 10:53:08 CEST`
- Archive size: `29,877,078` bytes
- SHA-256:
  `63184a72c7983ebf0157fa42a562a8d434a697c67ee7cf30ebc9bd5f01b3aa66`
- Both the archive file list and printable archive contents were searched for
  the retired provider id/name patterns; neither check returned a match.
- The archive file list still contains the Universal Client `builtin-tools`,
  `client-contract`, `client-core`, `dialect-streaming`, and `tool-registry`
  modules, together with the Kimi, GLM, OpenRouter, and Local Models client
  provider adapters.

## Launch Smoke

The rebuilt app launched successfully from the package. The packaged main
process was observed as PID `74660` at the time of verification.
