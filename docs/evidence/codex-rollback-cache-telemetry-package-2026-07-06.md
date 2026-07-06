# Codex Rollback Cache Telemetry Package - 2026-07-06

## Scope

Rebuilt the packaged macOS app after the Codex rollback acceptance fixes:

- Rollback preserves the first two visible Codex user turns as the
  warmup/cache-anchor pair and sends only `Turns - 2`.
- `Turns` is displayed next to `Rollback`.
- Provider-reported cached input tokens flow through Core telemetry and render
  as `Cache` beside `Tokens` when available.

## Commands

```text
npm run build
npm run package:mac
```

`npm run package:mac` stopped the previously running packaged app process
before rebuilding.

## Result

```text
release/mac-arm64/Harness AI.app
release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

Verified artifact sizes:

```text
302M  release/mac-arm64/Harness AI.app
29M   release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

Verified artifact timestamp:

```text
2026-07-06 15:27:21 CEST  release/mac-arm64/Harness AI.app
2026-07-06 15:27:21 CEST  release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

## User Retest Checklist

- Start `release/mac-arm64/Harness AI.app`.
- Open a Codex session and confirm the status panel order:
  `Tokens`, optional `Cache`, `Turns`, `Rollback`.
- Confirm `Rollback` is disabled while `Turns <= 2`.
- After adding dynamic turns, press `Rollback` and confirm the remaining
  provider-visible turn count preserves the first two user turns.
- Confirm `Cache` appears after Codex emits cached input token telemetry.
