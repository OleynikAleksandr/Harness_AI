# Codex Rollback Package Evidence - 2026-07-06

## Scope

Package build for the standalone `codex-rollback-2026-07-06` plan after the
Codex-only rollback implementation landed.

Included commits:

- `a68c8ff4 feat(codex-provider): expose app-server rollback`
- `c8c5c5e7 feat(session-runtime): add codex rollback intent`
- `70e45981 feat(core-runtime): expose codex rollback rpc`
- `1fb97dc2 feat(session-ui): enable codex rollback button`

## Commands

```bash
npm run build
npm run package:mac
test -d "release/mac-arm64/Harness AI.app"
find "release/mac-arm64/Harness AI.app" -maxdepth 3 -type f -name app.asar -print
du -sh "release/mac-arm64/Harness AI.app"
```

## Results

- `npm run build`: passed.
- `npm run package:mac`: passed.
- Existing packaged app process stopped before packaging: pid `4124`.
- Packaged app exists: `release/mac-arm64/Harness AI.app`.
- Packaged `app.asar` exists:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`.
- Packaged app size: `302M`.
- macOS code signing was skipped because signing identity is set to `null`.

## Verification Notes

- The package includes a Codex-only rollback path.
- Non-Codex providers remain outside this rollback scope.
- Live user acceptance still needs to validate a real Codex session:
  `Turns` before/after, token window before/after, Codex app-server
  `thread/read includeTurns=true`, `lastInput`, `lastCached`, and preserved
  cache-anchor behavior.
