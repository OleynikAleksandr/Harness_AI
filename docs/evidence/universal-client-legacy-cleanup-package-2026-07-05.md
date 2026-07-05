# Universal Client Legacy + ACP Kimi Cleanup Package Evidence - 2026-07-05

## Purpose

Package build for the user's acceptance of the two 2026-07-05 cleanups
(plan `universal-client-2026-07-04`, stream `harness-ai.phase4.stream7`,
task `harness-ai.phase4.stream7.task16`). The user ordered the build
directly ("Собери новый пакет") — the packaging gate's fresh explicit
confirmation.

The rebuilt app carries every provider-cleanup commit made this session; no
source change is left unpackaged.

## What This Build Carries

Both cleanups are in the packaged `app.asar`:

- **Legacy provider cleanup** (commits `ca0e9f8e`..`666b3eda`): the retired
  reference adapters `glm-native-provider`, `openrouter-provider` and
  `local-models-provider` and the orphaned `provider-turn-runner`
  direct-dispatch debt module are removed end-to-end (module directories +
  the consumed `src/reference/**` corpus, ~10.3k lines), together with their
  Core routing/liveness bindings, session/telemetry branches, renderer
  branches, settings schema (`providers.glmNative`), auth-store aliases,
  `ProviderId` union members, registry entries and product-tree entries. The
  relic `glmNative` Settings tab id is renamed to `glmClient`.
- **ACP Kimi retirement** (commits `624841ae`..`7b445ab6`): the ACP
  `kimi-provider` module is removed end-to-end, and Kimi is dropped from the
  native request capture feature. Capture now serves Claude/Codex only (the
  kimi-only reverse-forward bridge `capture-proxy-reverse.ts` and the
  `captureViaReverse` path are gone; `CAPTURE_PROVIDER_IDS = {claude,
  codex}`). The visible Kimi runs on the universal-client `kimi-client`
  endpoint: its Settings tab keeps only the client key card, its session
  tint follows `kimi-client`, and the `providers.kimi` settings section,
  `ProviderId` union member, registry entry and product-tree entry are gone.

The visible provider set is unchanged for the user: Claude, Codex, Kimi
(`kimi-client`), GLM (`glm-client`), OpenRouter (`openrouter-client`) and
Local Models (`local-models-client`). Only the internal retired modules left
the tree.

## Build

- `npm run build` completed (exit 0) — `dist/` (renderer + runtime)
  rebuilt.
- `npm run package:mac` completed (exit 0; log redirected to a file per the
  known pipe exit-144 artifact) — `app.asar` inside
  `release/mac-arm64/Harness AI.app` rebuilt 2026-07-05. `skipped macOS code
  signing` is expected (unsigned local build).
- Artifact: `release/mac-arm64/Harness AI.app` (untracked local build
  artifact; only this evidence doc and the plan advance are tracked).
- Quality gates ran automatically on every cleanup commit (pre-commit chain:
  plan validation, Ultracite, architecture, lint, knip, typecheck, tests —
  78 test files green at the last cleanup commit). The push gates
  (`check:dup`, `check:security`, `check:links`) were run manually and are
  green.

## Acceptance Focus

The user should restart the packaged app and confirm the cleanups are
invisible in normal use:

- The visible picker still lists exactly the six providers above; no
  duplicate or legacy entries appear.
- Kimi still starts and runs a live session (on `kimi-client`); its Settings
  tab shows the single "Kimi For Coding API Key" card.
- GLM / OpenRouter / Local Models still start, run, and keep their Settings
  tabs (GLM tab unchanged behaviour under its renamed `glmClient` id).
- Native Request Capture (General settings) offers Claude and Codex only —
  Kimi is no longer a capture target.

## Verification Status

- This document records the BUILD evidence only. Live acceptance is the
  user's run on this packaged app. No new acceptance-run evidence file is
  planned unless the user requests one; a blocking finding would reopen the
  relevant cleanup task.
