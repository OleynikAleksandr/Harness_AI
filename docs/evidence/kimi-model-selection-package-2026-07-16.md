# Kimi Model Selection Packaged Verification — 2026-07-16

## Scope

Expose the three models returned by the current Kimi Coding Plan key through
one provider-runtime catalog, persist the selected default, show the same
selection in Settings and the new-session provider card, and route the
immutable Core session model through every Kimi universal-client turn.

## Verified Provider Contract

The live `GET https://api.kimi.com/coding/v1/models` response for the current
subscription key returned:

- `kimi-for-coding` — K2.7 Coding;
- `kimi-for-coding-highspeed` — K2.7 Coding HighSpeed;
- `k3` — K3.

A direct completion against `kimi-for-coding-highspeed` returned HTTP 200,
reported the same response model id, and completed with `OK`. A direct K3
completion also returned HTTP 200 when `temperature` was omitted; K3 rejects
`temperature: 0` and requires the provider default value `1`. Harness does not
send a temperature parameter, so its shared universal-client request remains
compatible.

## Implemented Contract

- `provider-descriptor` owns the three model ids, labels and Settings
  descriptions in `KIMI_CLIENT_MODELS`.
- settings normalization preserves any of the three accepted ids and falls
  back to `kimi-for-coding` only for an unknown stored value.
- Kimi Settings renders a `DefaultModelCard` from that provider-owned catalog.
- the new-session provider card reads `providers.kimiClient.defaultModel`; the
  same resolved value becomes the immutable Core `session.model`.
- `KimiClientProviderFacade.sendMessage` reads that Core model from
  `ProviderTurnOptions` for every turn, with `kimi-for-coding` retained only as
  the legacy-caller fallback.
- approved localization dictionaries cover the card title, helper copy and all
  three model descriptions.

## Automated Verification

- Commit hooks passed architecture, formatting/lint, Knip, typecheck and the
  full test suite after each implementation commit.
- Final suite result: `Tests: OK (113)`.
- Focused Kimi adapter tests cover `k3`, `kimi-for-coding-highspeed`, and the
  legacy `kimi-for-coding` fallback.
- Focused UI tests cover the shared Kimi catalog, Settings card binding and
  new-session provider-card settings lookup.
- `npm run check:dup`: passed both repository and workspace thresholds.
- `npm run check:security`: 0 production vulnerabilities.
- `npm run check:links`: OK.
- `npm run build`: production runtime and renderer build succeeded.
- `npm run package:mac`: unsigned macOS arm64 directory package succeeded.

## Packaged Artifact

- Application:
  `release/mac-arm64/Harness AI.app`
- Runtime archive:
  `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar`
- `app.asar` SHA-256:
  `ee6d0e739411418e2d2e006fcc55a4bb3d875f9f0b34bb7b61e05aa7fdda3a31`
- Archive inspection confirmed all three ids in the packaged renderer and
  provider descriptor, `Kimi Default model` in the packaged renderer, and
  `readTurnModel` in the packaged Kimi adapter.

## Packaged UI Smoke

The packaged application launched successfully with its Core child process
running from the new `app.asar`. Opening Settings → Kimi showed:

1. K2.7 Coding — selected current default;
2. K2.7 Coding HighSpeed;
3. K3.

All three rows rendered with the configured Russian UI Helper Text
translations. The smoke inspection did not change or save the user's current
selection. The app remains open on the Kimi Settings tab for manual retest.

## User Acceptance Checklist

1. Select K2.7 Coding HighSpeed, save Settings, and open the new-session
   provider picker; the Kimi card must show `kimi-for-coding-highspeed`.
2. Start a new Kimi session and send a short prompt; the session status/model
   must remain HighSpeed for the lifetime of that session.
3. Repeat with K3; the new session must carry `k3` and complete a live turn.
4. Optionally return the default to K2.7 Coding. Existing sessions must retain
   the model they were created with.

User acceptance is pending; the active scope remains open.
