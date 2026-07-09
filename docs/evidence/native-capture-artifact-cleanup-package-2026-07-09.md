# Native Capture Artifact Cleanup Package Evidence - 2026-07-09

## Scope

Packaged rebuild for the Native Request Capture artifact cleanup scope
(`native-capture-artifact-cleanup-2026-07-09`). This build carries:

- `cb436a33` `plan: create native capture artifact cleanup scope`
- `b7de2ede` `fix: clarify native capture artifacts`

The implementation changes the capture artifact contract so the raw JSONL
contains only captured upstream request records, local lifecycle/proxy/provider
diagnostics move to a sibling `.diagnostics.jsonl`, and the markdown report
shows the profile-relevant payload groups as readable text:

- `System Prompt`
- `Tool Declarations`
- `Developer Context: Permissions, Skills, Plugins`

The Settings copy now labels the JSONL as a raw artifact and no longer claims
the Codex capture path never sends upstream.

## Build

- User explicitly requested a new package build for testing.
- Command: `npm run package:mac`
- Build target: `darwin/arm64`, unsigned by configuration.
- Packaged app path: `release/mac-arm64/Harness AI.app`
- Rebuilt app bundle timestamp: `2026-07-09 17:43`
- Rebuilt asar path:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- Rebuilt asar size: `30487436` bytes.

`npm run package:mac` stopped the previously running packaged app process,
ran `npm run build` (`typecheck`, runtime build, Vite renderer build), and
rebuilt `release/mac-arm64/Harness AI.app`.

## Verification State

- Implementation commit gates passed before packaging:
  `plan:validate`, Ultracite, `check:architecture`, `lint`, `check:knip`,
  `typecheck`, and `npm test` (`81` tests).
- Package command completed successfully and verified the packaged app bundle
  exists on disk.
- User retest is next: run Native Request Capture from General Settings,
  starting with Codex app-server, and confirm the generated artifacts use the
  new split:
  - raw `.jsonl` contains `request_captured` records only;
  - `.diagnostics.jsonl` contains capture lifecycle, proxy events, applied
    envelope, and provider diagnostic context;
  - `.md` groups readable payload content under system prompt, tool
    declarations, and developer context without JSON-escaped `\n` text.
