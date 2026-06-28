# Kimi Usage Limits Package Verification - 2026-06-28

## Scope

Verification for packaged Harness AI after restoring Kimi five-hour and weekly usage-limit telemetry display.

## Reference Check

The reference project reads Kimi usage limits from the native Kimi config/API path:

- config: `~/.kimi-code/config.toml`
- config section: `[providers.kimi-for-coding]`
- API: `https://api.kimi.com/coding/v1/usages`

Harness AI uses the same reference-compatible `KimiUsageLimitsReader`.

## Root Cause

Kimi usage-limit refresh emits a provider telemetry payload without a provider event `type`.

Before the fix, `SessionRequestHandlerFacade.handleProviderEvent` returned early when `event.type` was missing, so the payload never reached session telemetry and the UI showed:

- `5h unavailable`
- `Weekly unavailable`

## Fix Verified

`SessionRequestHandlerFacade` now updates telemetry for any record-shaped provider event before routing typed provider events.

Packaged `app.asar` contains the built handler with:

- `updateTelemetryWithProviderEvent(sessionId, event)` present
- `typeof event.type !== "string"` guard present
- telemetry update before the type guard

## Live Kimi Reader Smoke

The local Kimi reader smoke against `~/.kimi-code/config.toml` returned a payload:

```json
{
  "hasPayload": true,
  "currentSession": 3,
  "weekly": 3
}
```

## Build Artifact

Packaged macOS app exists:

```text
release/mac-arm64/Harness AI.app
```

Packaged Electron archive exists:

```text
release/mac-arm64/Harness AI.app/Contents/Resources/app.asar
```

`npm run package:mac` completed successfully before this verification.
