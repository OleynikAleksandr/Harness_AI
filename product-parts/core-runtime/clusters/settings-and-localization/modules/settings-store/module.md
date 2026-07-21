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
- Machine-wide Profile Studio defaults. `profileStudio.defaultCreatorAgentId`
  persists in the system settings file and normalizes to the Core-owned
  `codex-profile-creator-agent` option when absent or invalid. The first option
  fixes its execution identity at Codex / GPT-5.6 Sol / high; renderer clients
  consume this catalog instead of reconstructing agent capabilities.
- Provider default paths normalized to Harness namespaces for active settings
  sections.
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
- Persistence projections (which slice of the merged settings goes into the
  system settings file vs the workspace settings file) live in
  `settings-store-projections.ts`, split from the facade for the 500-line
  implementation cap; the facade imports `systemSettingsFrom` /
  `workspaceSettingsFrom` from it.
- The `kimi-client` provider has its dedicated `providers.kimiClient` section
  (`ProviderClientKeySettings`: `apiKey` + `defaultModel`), the key-storage
  shape for universal-client endpoints — key-only onboarding, no `baseUrl`
  (the dialect profile owns it), and `defaultModel` validated by normalization
  against the provider-descriptor catalog (`kimi-for-coding`,
  `kimi-for-coding-highspeed`, `k3`), with unknown legacy values falling back
  to `kimi-for-coding`. The section persists into the
  system settings file, syncs into the provider-auth-store file
  (`providers/kimi-client/settings.json`) on save like the other key-based
  providers, and reads back through the auth overlay, so
  `getApiKey("kimi-client")` and the Settings UI see one value.
  Since the 2026-07-17 Kimi settings parity stream the section additionally
  carries the common `autoUpdate` (default `{ enabled: false }`, projected
  into the system settings file like the other providers' auto-update flags)
  and `sessionContinuity` (default `{ remainingPercentThreshold: 30 }`,
  projected into the workspace settings file like `workspaceCommon`) keys via
  `Pick<ProviderCommonSettings, ...>`; the auth-store overlay/sync still
  exchanges only the string connection fields, so these two keys live purely
  in the settings files. Like every provider, the stored continuity threshold
  has no runtime consumer yet — it is settings truth for the Settings surface.
  Since the 2026-07-17 native thinking stream the section also carries
  `reasoningByModel` (workspace-projected like Codex/Grok): normalization
  offers `low`/`high`/`max` for every catalog model with `high` as the
  default (`KIMI_REASONING_EFFORTS_BY_MODEL`), and
  `buildProviderTurnOptions` hands the per-model level to the `kimi-client`
  adapter — the native driver writes it into the workspace-home config
  before the CLI spawns.
- The `glm-client` provider has its dedicated `providers.glmClient` section
  for the universal-client GLM endpoint: `apiKey`, `defaultModel`, and
  `reasoningEffort`. It is key-only (`baseUrl` is owned by the GLM dialect
  profile), persists in the system settings projection, defaults to `glm-5.2`
  with `max` reasoning, and normalization validates the model against the
  Core-owned GLM client catalog (`glm-5.2`, `glm-5.1`, `glm-5-turbo`,
  `glm-4.7`, `glm-4.6`). The provider-key map binds `glm-client` to this
  section once the internal provider id is introduced; save/load syncs the API
  key through `providers/glm-client/settings.json` like the other key-based
  providers.
- The retired `providers.glmOpenCode` and `providers.glmNative` settings
  sections are removed from the typed settings schema, defaults, projections,
  auth overlay/sync, and normalization (`glmNative` left with the 2026-07-05
  legacy cleanup). Legacy settings files may still contain those objects; they
  are ignored by typed consumers and dropped from persisted projections on the
  next save.
- The auth overlay and auth-file sync run on the universal-client ids
  (`glm-client`, `kimi-client`, `local-models-client`, `openrouter-client`);
  the auth store maps the last two onto the same legacy-named file aliases,
  so existing auth files keep working. `PROVIDER_KEY_BY_ID` keeps one-commit
  bridge lines for the retired `glm-native`/`openrouter`/`local-models` ids
  until they leave the `ProviderId` union (the map is exhaustive over the
  union; nothing reads the bridged entries).
- The `providers.localModels` section carries the universal-client Local
  Models connection: `baseUrl` (default `http://127.0.0.1:1234`; normalization
  keeps http(s) URLs only and trims trailing slashes),
  `contextLengthByModel: Record<string, number>` (the per-model context
  wish applied through the LM Studio v1 management API; `0`/absent = server
  default; normalization keeps non-negative integer entries only), and the
  existing `defaultModel`. There is NO `apiKey` field (2026-07-05 user review
  fix: LM Studio's local server has no authentication; the llama.cpp/proxy
  niche stays on the auth-store env fallbacks) and NO global `contextLength`
  (replaced by the per-model map) — legacy keys in stored files are ignored
  structurally and dropped on the next save. Connection fields persist in the
  system settings projection and sync through the provider-auth-store;
  `defaultModel` stays in the workspace projection.

## Reasoning Effort Contract

- Owns the `ReasoningEffort` type: `low`, `medium`, `high`, `xhigh`, `max`, `ultra`, `ultracode`.
- `ultracode` mirrors the Claude CLI orchestration mode (xhigh + dynamic workflows).
- `ultra` is the Codex app-server effort id for maximum reasoning with automatic task delegation; it is distinct from Claude `ultracode`.
- `CLAUDE_REASONING_EFFORTS_BY_MODEL` (exported from `settings-normalization`, not the `node:fs`-backed facade, so the renderer can import it without bundling persistence) is the source of truth for which efforts each Claude alias exposes: Opus full set + ultracode, Sonnet without xhigh, Haiku none. The settings UI reads this map to filter the per-model selector.
- `normalizeSettings` validates per-model Claude efforts against the whitelist and falls back to the provider default effort when a stored value is unknown.
- Codex does not reuse Claude effort ranks. `CODEX_REASONING_EFFORTS_BY_MODEL` and `resolveCodexReasoningEffort` own the picker-visible Codex app-server capabilities: GPT-5.6 Sol and Terra expose `low`, `medium`, `high`, `xhigh`, `max`, and `ultra`; GPT-5.6 Luna stops at `max`; GPT-5.5, GPT-5.4, GPT-5.4 Mini, and GPT-5.3 Codex Spark stop at `xhigh`. The GPT-5.6 family defaults to `medium`, while Spark follows the provider default `high`. Retired GPT-5.2 settings normalize to the provider-default GPT-5.6 Sol. `supportsCodexReasoningSummary` records Codex model summary support separately; Spark keeps reasoning effort control but disables per-turn reasoning summaries.
- `providers.grok` stores the Core-selected default model and per-model native
  reasoning values. The verified installed catalog is `grok-4.5` (default,
  `high/medium/low`, default `high`) and `grok-composer-2.5-fast` (provider-
  managed reasoning). Normalization rejects unknown stored values, system/
  workspace projections persist the section, and provider id `grok` resolves
  through the same `getProviderModel` boundary as other native channels.
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
