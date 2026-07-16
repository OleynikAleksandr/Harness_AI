# Provider Settings UI Module

## Responsibility

Render provider cards, auth/model/reasoning controls, and provider status settings.

## Public Facade

`ProviderSettingsUiFacade`

## Inputs

- Provider settings snapshot.
- Provider descriptor snapshot.

## Outputs

- Provider settings update intents.
- Auth/configuration action intents.
- Universal-client API-key section (`client-api-key-card.tsx`): a reusable
  card for client endpoint providers — one password field bound to the
  provider's `providers.*.apiKey` settings entry plus the provider-help copy,
  localized by message prefix. Every provider connected to the universal
  client mounts one in its Settings tab; the Kimi tab holds the
  `KimiClientApiKeyCard` bound to `providers.kimiClient.apiKey` (prefix
  `settings.provider.kimiClient`, card title
  `settings.provider.kimiClient.apiKey`) above a `DefaultModelCard` bound to
  `providers.kimiClient.defaultModel`. The card consumes the shared
  provider-descriptor catalog (`kimi-for-coding`,
  `kimi-for-coding-highspeed`, `k3`) through `PROVIDER_MODEL_OPTIONS`, so the
  renderer does not duplicate provider model ids. The retired ACP thinking
  toggles remain absent after the kimi-provider retirement (2026-07-05 user
  order). The GLM
  tab binds `GlmClientApiKeyCard` to `providers.glmClient.apiKey` (prefix
  `settings.provider.glmClient`, card title
  `settings.provider.glmClient.apiKey`) above the universal-client GLM model
  selector. The retired native GLM connection/default-model block is not
  rendered in Settings. The renderer only edits the settings snapshot; key storage truth stays
  Core-owned (settings store persistence + auth-store sync).
- Local Models connection card (`LocalModelsClientConnectionCard`, the
  connection variant of the client card family in `client-api-key-card.tsx`):
  Base URL ONLY (server root or `/v1` prefix) bound to
  `providers.localModels.baseUrl` (card title
  `settings.provider.localModelsClient.connection`, helper copy under the
  `settings.provider.localModelsClient.*` prefix). There is NO API key field
  (2026-07-05 user review fix — LM Studio's local server has no auth; env
  fallbacks cover the llama.cpp/proxy niche silently) and NO global context
  override — the context wish is PER MODEL (`contextLengthByModel`), edited
  in the model list. The Local Models tab mounts the card above the model
  list card (`LocalModelsSettingsCard`).
- Local Models model list on the structured catalog
  (`LocalModelsSettingsCard`): rows come from the `get-local-models` RPC
  `entries` (display name, max/loaded context, tool capability), the row
  click keeps choosing `providers.localModels.defaultModel`, and the
  selected model (when the server reports a management surface —
  `maxContextLength` present) carries a context control: a numeric field
  prefilled with the loaded window plus an Apply button that calls the
  `set-local-model-context` RPC (Core persists `contextLengthByModel` and
  reloads the model in LM Studio), then swaps in the refreshed catalog.
  Plain-id servers (Ollama/llama.cpp) show bare rows without the control.
  The renderer never talks to the local server directly — everything flows
  through Core RPCs (Core Authority).
- Shared provider-tab card helpers (`DefaultModelCard`, `localizeModelOptions`) live in
  `settings-provider-cards.tsx`, split from `settings-tab-content.tsx` for
  the 500-line cap.
- OpenCode no longer has a Settings tab/card or version/update card in Phase 3.
- Full app restart intent from the App Controls card. The App Controls card is
  the first card in the General tab (above Localization), and its copy makes
  clear that the Electron host and Core runtime both reload from disk. The
  restart row (`settings-core-row`) lays the button and its status label out
  with a gap, and the button shows a spinner (`settings-spinner`) while the
  restart is being requested. Restart App saves dirty Settings first, then calls
  the Electron host relaunch bridge instead of only restarting the Core child
  process.
- Settings save and Restart App actions catch rejected bridge promises and
  always clear their busy state. Failed restart requests remain on the Settings
  surface with an error message instead of leaving the restart spinner running
  forever.
- Settings Save owns the full localization refresh lifecycle: before Core
  save/materialization starts, the Settings surface shows a blocking
  localization refresh card with a spinner, then keeps the overlay active until
  the browser localization payload refresh settles. This blocks Settings
  interaction for the same operation the user is waiting on instead of showing a
  silent disabled Save button after Core work already completed.
- General tab Core Controls and Localization copy resolves through the shared
  browser localization provider with stable message ids and bootstrap
  fallbacks.
- The Localization UI Translation Engine select reads and writes Core-owned
  `general.localization.uiEngineId`; the legacy `engineId` alias is only kept in
  sync for settings normalization compatibility.
- The UI Translation Engine and Reasoning Translation Engine selects always
  offer `Google GTX Free`. Each select additionally offers an
  `OpenRouter (<model slug>)` option, sourced from
  `providers.openRouter.translationProfiles.{uiTranslation,reasoningTranslation}.model`,
  once that profile has a real model selected in the OpenRouter Profiles cards
  (`settings-tab-content.tsx`); while a profile still holds the unset
  placeholder `openrouter-default`, its select shows only Google GTX Free. The
  option label shows the raw model slug, not a fetched display name. Selecting
  `openrouter-ui-translation` / `openrouter-reasoning-translation` routes that
  category's Core translation calls through
  `createProviderTranslationEngines`' matching OpenRouter engine (see
  `provider-translation-engines/module.md`).
- Settings shell copy, provider tab labels, and the first shared provider-card
  labels/helpers resolve through the browser localization provider and approved
  source dictionary ids.
- The tab strip (`SETTINGS_TABS` in `settings-model-options.ts`) ends with the
  `Profile Creator` tab to the right of General; `SettingsTabContent` delegates
  that tab's content to the `profile-settings-ui` module facade
  (`ProfileSettingsUiFacade`), so session profile management stays owned by its
  own module. The `settings.tab.profileCreator` label resolves through the
  approved source dictionary like the other tab labels.
- Remaining Settings provider helper copy resolves through the same browser
  localization provider, including session continuity helper text, GLM default
  model helper text, Local Models helper/empty-state text, OpenRouter helper
  text, endpoint latency helper copy, and the initial Restart App status
  message.
- Dynamic OpenRouter model descriptions returned by OpenRouter search are not
  added to static dictionaries. They are sent to Core through
  `translateDynamicText`, which uses the Reasoning Translation Engine target and
  returns translated text for the visible model rows.
- The Native Request Capture card (`native-capture-card.tsx`) renders below
  General Settings: provider, model, and model-aware reasoning selectors
  populated from the Core `listCapturableModels` RPC (`provider-descriptor`
  catalog), a Capture button, capturing/failed/done status, and the Core-returned
  `.md`/`.jsonl` artifact paths. The renderer only submits the Core
  `captureNativeRequest` command (`providerId`, `model`, and the exact
  Core-declared `reasoningEffort`) and displays the Core-returned result. A
  provider/model change resets the local selector to that model's Core default;
  models with no Core-declared reasoning options (the Kimi native CLI channel)
  hide the reasoning field and do not block Capture, while Claude/Codex still
  require the exact selected effort. The renderer does not import or
  reconstruct provider capability maps. Capture truth
  (proxy, record-only request, artifacts) is Core-owned.
- The OpenRouter model slug search (`OpenRouterModelEndpointPicker` in
  `openrouter-settings-card.tsx`, used by the provider default model block and
  both OpenRouter Profiles translation model blocks) collapses its match list
  to only the selected card once a model is picked or when the picker opens
  with a stored model. Typing in the search field expands the list again, and
  a refresh icon button inside the right edge of the field
  (`settings.openRouter.searchRefresh` label) re-runs the search and reopens
  the full match list. Collapsing is presentation-only renderer state; the
  selected model itself stays in Core-owned settings. The model row renderer
  and the dynamic description translation hook live in
  `openrouter-model-row.tsx` (split out for the 500-line cap).
- Claude default-model helper copy, thinking descriptions, model descriptions,
  and new-session note resolve through the browser localization provider instead
  of hardcoded Russian text, so Claude follows the same UI Helper Text language
  selection as the rest of Settings. Claude alias descriptions stay
  version-neutral; the Sonnet helper copy does not include a concrete
  Anthropic model id because the alias should track the current underlying
  model.
- Codex default-model helper copy, reasoning summary description, model
  descriptions, and new-session note also resolve through the browser
  localization provider. The picker mirrors the app-server-visible order:
  GPT-5.6 Sol, Terra, Luna, GPT-5.5, GPT-5.4, GPT-5.4 Mini, and GPT-5.3 Codex
  Spark; retired GPT-5.2 is not rendered. Per-model selectors expose `Ultra`
  only for Sol and Terra, while Luna stops at `Max`.
- The Grok tab reads and edits only Core-owned `providers.grok` settings. Its
  model card exposes the verified installed catalog in provider order:
  `grok-4.5` with `High/Medium/Low` and `grok-composer-2.5-fast` with honest
  provider-managed reasoning. It also uses the shared session-continuity card;
  no renderer capability inference or direct CLI call occurs.
- The Kimi default-model card renders K2.7 Coding, K2.7 Coding HighSpeed and
  K3 from the provider-descriptor catalog and updates only
  `providers.kimiClient.defaultModel`. Its title, helper copy and model-row
  descriptions resolve through the browser localization provider and approved
  `settings.provider.kimiClient.defaultModel*` / `.model.*.description` keys.
- The GLM tab includes a universal-client default-model card bound to
  `providers.glmClient.defaultModel` and populated from
  `PROVIDER_MODEL_OPTIONS.glmClient` (`glm-5.2`, `glm-5.1`, `glm-5-turbo`,
  `glm-4.7`, `glm-4.6`). Its helper copy and model descriptions resolve through
  the browser localization provider. The tab id is `glmClient`
  (`settings.tab.glmClient` label key) — the relic `glmNative` id was renamed
  by the 2026-07-05 legacy cleanup after the `glm-native` module/settings
  removal; no native-GLM card exists anymore.
- When the dialog opens, and after a successful settings save or workspace
  settings reset, the facade calls the parent-provided localization runtime
  refresh callback so newly materialized bundles are visible even when there are
  no dirty Settings changes to save.
- Shared native select controls commit both `input` and `change` events so
  language/category selections immediately mark the Settings draft dirty and
  enable Save Changes.
- The Localization "Open glossary file" action calls the Core
  `ensureGlossaryFile` bridge method first (which creates the do-not-translate
  glossary file with seeded terms if it does not exist yet) and opens the
  real returned path in VS Code; it no longer guesses a path under the open
  workspace, so the facade no longer needs a `workspacePath` prop.
- A "Rebuild translations" button sits next to "Open glossary file" in the
  same row (`GlossaryCard`, `.settings-core-row`) so editing the glossary
  file directly (outside Settings Save) has a way to take effect. It calls
  the Core `rebuildLocalization` bridge method, which forces a full
  retranslation ignoring the localization bundle cache (glossary content is
  not part of that cache key), then calls the parent-provided localization
  runtime refresh callback so the running app picks up fresh translations
  immediately. The button shows a `settings-spinner` and localized
  "Rebuilding translations..." label while busy; the row's status span shows
  the plain-English result/error afterward, matching the Restart App row's
  status convention.

## Reasoning Effort Select

- `ReasoningEffortSelect` renders its open menu through a React portal on `document.body`, positioned from the trigger's bounding box, so the menu overlays the whole settings dialog instead of being clipped by `overflow: hidden` ancestors or the model-row grid. It closes on outside click, Escape, scroll, or resize.
- Because the portal renders outside `.settings-backdrop`, the scoped `--ss-*` tokens do not resolve inside it, so `.settings-reasoning-menu` uses literal popup-elevation values instead of tokens: an opaque surface `#313438` (a few steps lighter than the model cards `#232527`, so the menu stands off the surface below it) and a lighter border `#4d5258`. This also keeps the menu fully opaque rather than falling back to `transparent`.
- The menu options come from `REASONING_EFFORT_OPTIONS`. The optional `values` prop limits the rendered levels to a per-model set; without it, `ultracode` is hidden (Opus-only level).
- The Claude card reads `CLAUDE_REASONING_EFFORTS_BY_MODEL` from Core `settings-normalization` (a persistence-free module, so the renderer bundle stays clean of `node:fs`) to pass each alias its supported levels (Opus gets ultracode, Sonnet drops xhigh) and renders "Not adjustable" instead of a selector for Haiku.
- The Codex card reads `CODEX_REASONING_EFFORTS_BY_MODEL` and `resolveCodexReasoningEffort` from the same Core module. Codex selectors show only the levels declared for that Codex model and use Core defaults. Summary support is separate from effort selection; Spark still exposes effort levels but the provider disables per-turn summaries for it.
- Provider model cards render the model label and description only; the raw model id (which duplicated the label, e.g. "Sonnet" / "sonnet") is no longer shown in the Claude, Codex and reference cards. OpenRouter keeps its `settings-model-id` span because there it carries routing/metric text (e.g. "default routing", endpoint metrics), not a duplicate name.
- The shared `ProviderVersionsCard` update button shows a `settings-spinner` next to the "Updating to ..." label while a CLI/SDK target is updating (driven by `updatingTargets`), so every provider with manual updates has the same in-progress feedback until the current version refreshes.
- `ProviderVersionsCard`'s update-risk warning banner and the auto-update
  toggle's description resolve through the browser localization provider
  (`settings.provider.versions.warning` in `messages_for_the_user`,
  `settings.provider.versions.autoUpdate.description` in `ui_helper_text`).
  Both were previously hardcoded Russian strings that showed up regardless of
  the configured UI language, including in an otherwise-English session; they
  now follow the same UI Helper Text / Messages for the User language
  selection as the rest of Settings, in every Claude/Codex Versions card.

## Settings Surface Styling

- `settings-surface.css` defines scoped `--ss-*` design tokens on `.settings-backdrop`; the global `--pm-*` tokens in `session-window.css` are left unchanged, so this restyle is contained to the settings dialog and shared by every provider tab through the common classes.
- The tab strip uses content-width tabs (`flex: 0 1 auto`, `min-width: 64px`,
  `white-space: nowrap`, 10px horizontal padding, 11px font, 6px gap) instead
  of a fixed flex-basis: nine tabs previously overflowed the 960px dialog and
  cut off the `Profile Creator` tab (acceptance finding 2026-07-02, screenshot).
  All nine tabs now fit with headroom for at least one future tab; a long tail
  of new tabs still degrades gracefully through the strip's `overflow-x: auto`.
- Neutral graphite palette with three elevation levels: dialog/content (`--ss-bg`) is the darkest surface, the section block `.settings-card` (`--ss-block`) sits one step lighter, and the model/version cards `.settings-model-row` / `.settings-version-row` (`--ss-card`) are lighter still. Card borders (`--ss-card-border`) are value-matched to the field borders so they read with the same weight on their respective surfaces.
- Selection is teal by tone, not by brightness: the selected model (`.settings-model-row.active` / `.settings-option-row.active`) and the active provider tab (`.settings-tab.active`) use a muted teal fill (`--ss-sel`) at the same lightness as the neutral cards plus a thin muted teal border (`--ss-sel-border`); the bright accent dot stays as the radio indicator.
- Reasoning fields (`.settings-reasoning-trigger`) and text fields are in-tone with their row — one step lighter than the card (`--ss-field`) — and switch to a teal-tinted fill (`--ss-field-sel`) on the active model, instead of the previous near-black field. Toggle rows are borderless rows inside the block rather than separate framed boxes.
- Text hierarchy: a layer at the end of `settings-surface.css`, scoped under `.settings-backdrop` so it outranks the element-level `font-weight: 300` reset, makes primary roles (tab labels, section titles, profile titles, model/version names, model option names, checkbox labels, and the field-label row) `font-weight: 500`, and secondary roles (descriptions, helper, notes, model id/description, version text, core status) italic + `font-weight: 300`, collapsed to one `--pm-text-muted` tone (overriding the per-rule literal greys). The shared `--pm-*` tokens lift primary brighter (`#f1f3f5`) and dim muted (`#767d86`). The italic secondary text uses a slightly brighter `--pm-text-secondary` (`#868d97`) so it reads a touch stronger than plain muted; these tokens live in `session-window.css` and are consumed here.

## Owned Paths

- `module.md`
- `src/**`
