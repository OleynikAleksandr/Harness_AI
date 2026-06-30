# Remaining Settings Localization Package Evidence - 2026-06-30

## User Report

After the browser localization payload IPC repair, Russian UI Helper Text and
Messages started working, but several Settings provider tabs still had English
helper text:

- Claude/Codex session continuity helper copy.
- GLM default model helper copy.
- OpenCode card helper copy, reasoning helper, model helper text and home note.
- Local Models helper copy.
- OpenRouter helper copy and endpoint latency explanation.
- OpenRouter model descriptions returned by provider search.
- Initial Restart App status copy.

## Root Cause

Most reported strings were still hardcoded in provider Settings cards instead of
being resolved through `useBrowserLocalization().t(...)` with approved source
dictionary ids.

OpenRouter model descriptions are dynamic provider-returned text. They cannot
be part of static source dictionaries, so translating them in the renderer would
violate the Core-owned localization boundary.

There was also a cache correctness issue: browser runtime bootstrap cache keys
only included the settings snapshot. Adding new dictionary ids could therefore
reuse a stale cached payload without those ids.

## Change

- Added approved source dictionary ids for the remaining static Settings helper,
  status, and message strings.
- Routed the reported Settings cards through the browser localization provider.
- Added Core RPC `translate-dynamic-text`, exposed through preload and forwarded
  by the Electron Core process bridge.
- OpenRouter model rows now request Core-owned translation for dynamic provider
  descriptions. Core uses the saved Reasoning Translation Engine and the
  `reasoning` category target language.
- Added source dictionary fingerprints to browser localization cache keys and to
  materialized category bundles, so dictionary changes invalidate stale caches.

## Verification

- `npm run quality` passed.
- `npm run package:mac` passed.
  - The package script stopped stale packaged processes:
    `70999, 71008, 71009, 71010, 71019`.
  - `npm run build` ran as part of packaging.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
    at `2026-06-30 22:03:51`.
- Packaged `app.asar` contains the new dynamic translation IPC and dictionary
  fingerprint code.

## Expected User-Visible Result

With UI Helper Text, Messages for the User, and Reasoning set to Russian while
UI Labels stay English:

- Section labels and tab labels remain English.
- Explanatory helper copy in the reported provider cards displays in Russian.
- Initial Restart App status displays in Russian.
- OpenRouter provider-returned model descriptions are translated dynamically
  through Core using the Reasoning Translation Engine.
