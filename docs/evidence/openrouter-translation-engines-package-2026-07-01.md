# OpenRouter Translation Engines Package Evidence - 2026-07-01

## Change

- Added `OpenRouterTranslationEngine`, a lean non-streaming OpenRouter chat
  completion translation transport, plus a `createProviderTranslationEngines`
  factory that registers it under `openrouter-ui-translation` /
  `openrouter-reasoning-translation` engine ids alongside the always-available
  `google-gtx` engine.
- Wired the factory into every Core Runtime translation call site: the static
  UI localization bundle materializer, the ad-hoc dynamic translation RPC, and
  the live reasoning-overlay path (now built per call instead of once at
  singleton construction, so a saved OpenRouter model takes effect without a
  Core restart).
- Relocated `resolveOpenRouterTranslationEnginesConfig` to the `settings-store`
  module (`settings-and-localization` cluster) to avoid a reverse Core Runtime
  cluster dependency (`session-runtime` depending on `runtime-process`).
- `General Settings > UI Translation Engine` and `Reasoning Translation Engine`
  dropdowns now show an `OpenRouter (<model slug>)` option next to
  `Google GTX Free` whenever the matching `OpenRouter Profiles` card
  (`UI Translation Model` / `Reasoning Translation Model`) has a real model
  selected; the option is hidden while that profile still holds the unset
  placeholder `openrouter-default`.
- Also removed 13 never-implemented `module.md`-only product tree scaffolds
  (across `workspace-architecture`, `session-runtime`, `development-orchestrator`,
  `intent-normalization`, `provider-home-and-auth`) that were unconditionally
  failing `check:architecture`, and fixed a `scripts/plan.mjs` commit-message
  path bug that broke `git commit` in a linked worktree.

## Verification

- Commits `2f85d2c`, `28c5ad5`, `63629cf`, `7683083`, `d616eff` each passed the
  implementation gates: `plan:validate`, `check:architecture`, `lint`,
  `check:knip`, `typecheck`, and `npm test`.
- Manual dev-mode verification (`npm run dev`): set `google/gemini-2.5-flash-lite`
  in both OpenRouter Profiles fields, saved, then confirmed
  `OpenRouter (google/gemini-2.5-flash-lite)` appeared alongside
  `Google GTX Free` in both the UI Translation Engine and Reasoning Translation
  Engine dropdowns in General Settings (user-confirmed).
- `npm run package:mac` passed.
  - `stop-old` found no stale packaged process.
  - `release/mac-arm64/Harness AI.app` exists.
  - `release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` was rebuilt
    at `2026-07-01T13:56:23Z`.
