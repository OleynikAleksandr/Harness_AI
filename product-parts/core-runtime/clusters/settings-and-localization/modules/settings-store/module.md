# Settings Store Module

## Responsibility

Own global and workspace settings persistence.

## Public Facade

`SettingsStoreFacade`

## Inputs

- Settings read/write intents.
- Global and workspace settings paths.

## Outputs

- Settings snapshot.
- Persisted settings update.
- Provider default paths normalized to Harness namespaces, including OpenCode config under `~/.harness-ai/providers/opencode/config.json`.
- Localization translation engine ids resolved as `uiEngineId` and
  `reasoningEngineId`; legacy `engineId` is kept as a UI compatibility alias
  for the UI translation engine.
- Localization sync impact checks include UI bundle settings only and exclude
  live reasoning language/engine settings.
- `resolveOpenRouterTranslationEnginesConfig(settings)` maps the persisted
  OpenRouter connection (`apiKey`/`baseUrl`) and `uiTranslation`/
  `reasoningTranslation` profiles into the shape Provider Runtime's
  `createProviderTranslationEngines` factory expects, so every translation call
  site builds its OpenRouter-backed engines from one settings-owned mapping.
- Core settings diagnostics append JSONL entries to
  `~/.harness-ai/logs/core/settings-store.jsonl` for settings load, save, reset,
  and localization category snapshots. The logger also creates the
  `logs/core`, `logs/interface`, and `logs/providers` roots and does not record
  provider secrets.

## Reasoning Effort Contract

- Owns the `ReasoningEffort` type: `low`, `medium`, `high`, `xhigh`, `max`, `ultracode`.
- `ultracode` mirrors the Claude CLI orchestration mode (xhigh + dynamic workflows).
- `CLAUDE_REASONING_EFFORTS_BY_MODEL` (exported from `settings-normalization`, not the `node:fs`-backed facade, so the renderer can import it without bundling persistence) is the source of truth for which efforts each Claude alias exposes: Opus full set + ultracode, Sonnet without xhigh, Haiku none. The settings UI reads this map to filter the per-model selector.
- `normalizeSettings` validates per-model Claude efforts against the whitelist and falls back to the provider default effort when a stored value is unknown.
- Codex does not reuse Claude effort ranks. `CODEX_REASONING_EFFORTS_BY_MODEL` and `resolveCodexReasoningEffort` own Codex model capabilities: GPT-5.2, GPT-5.3 Codex Spark, and current GPT-5.4/5.5 models expose `low`, `medium`, `high`, and `xhigh` and default to `medium`. `supportsCodexReasoningSummary` records Codex model summary support separately; Spark keeps reasoning effort control but disables per-turn reasoning summaries.

- Session profile picker memory is settings truth owned here
  (`session-profile-memory.ts`): the last selected profile id and the
  AutoNormalizer flag per provider, stored in
  `<harness home>/settings/session-profile-memory.json` beside
  `settings.json` (the main settings schema stays untouched). The session
  request handler records the selection fire-and-forget at create; the flag
  is contract-only until the normalizer exists.

## Owned Paths

- `module.md`
- `src/**`
