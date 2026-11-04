# Localization Runtime Module

## Responsibility

Own UI localization runtime contracts, source dictionary lookup, bootstrap
payload shape, glossary protection, user glossary loading, bundle
materialization, bootstrap payload reuse, and bundle state.

## Public Facade

`LocalizationRuntimeFacade`

## Inputs

- UI localization settings snapshot.
- Source dictionaries keyed by localization category and language.
- Approved English source dictionaries shipped as TypeScript exports.
- Settings shell, provider tab and first shared provider-card source strings are
  part of the approved English dictionaries.
- The dedicated Profile Studio Settings tab source strings are approved here:
  `settings.tab.profileStudio`, the Default Profile Creator Agent card/field
  labels, and its application-wide provider-backed helper copy. Session-profile
  helper text names `~/.harness-ai/ProfileStudio/Profiles` as the only current
  user-owned profile root.
- The Settings glossary card copy (`settings.localization.glossaryTerms.description`,
  `settings.localization.glossary.prefilled`) shows one example of each glossary
  line format — a plain do-not-translate term and a `Term - Desired translation`
  pair — matching the file format `UserGlossaryStore` actually parses.
- General Settings App Controls source strings identify restart as a full app
  relaunch because the Electron host and Core runtime both reload from disk.
- Claude provider settings helper copy and model descriptions are part of the
  approved `ui_helper_text` dictionary. Alias descriptions stay
  version-neutral; the Sonnet source string does not include a concrete model
  id so localized bundles do not preserve stale Anthropic release numbers.
- Codex provider settings helper copy and model descriptions are part of the
  approved `ui_helper_text` dictionary. The approved model keys cover the
  picker-visible GPT-5.6 Sol/Terra/Luna family plus GPT-5.5, GPT-5.4,
  GPT-5.4 Mini, and GPT-5.3 Codex Spark; the retired GPT-5.2 key is absent.
- The ACP Kimi provider settings helper copy and model descriptions
  (`settings.provider.kimi.*`) left the approved dictionaries with the
  kimi-provider retirement (2026-07-05 user order); only the universal-client
  Kimi help below remains.
- Kimi universal-client provider help
  (`settings.provider.kimiClient.description`,
  `settings.provider.kimiClient.apiKey.description`) is part of the approved
  `ui_helper_text` dictionary: it explains the subscription-key onboarding and
  where the Kimi For Coding key comes from (Kimi Code Console, up to 5 keys,
  each shown once at creation). The API-key card title
  (`settings.provider.kimiClient.apiKey`, "Kimi For Coding API Key") is part
  of the approved `ui_labels` dictionary. The Kimi model card is covered too:
  `settings.provider.kimiClient.defaultModel` in `ui_labels`, plus
  `.defaultModel.description` and the three
  `.model.<model-id>.description` entries (`kimi-for-coding`,
  `kimi-for-coding-highspeed`, `k3`) in `ui_helper_text`. The Kimi Session
  Continuity card title (`settings.provider.kimiClient.sessionContinuity`)
  is part of the approved `ui_labels` dictionary; its description and field
  label reuse the shared `settings.provider.sessionContinuity.*` strings.
- The provider Versions auto-update helper copy has a CLI-only variant
  (`settings.provider.versions.autoUpdate.cli.description`) in
  `ui_helper_text` for providers without an SDK entry — the Kimi Versions
  card — alongside the CLI+SDK string
  (`settings.provider.versions.autoUpdate.description`).
- GLM, Local Models, OpenRouter and session continuity Settings helper copy are
  part of the approved dictionaries so selecting Russian for UI Helper Text or
  Messages for the User covers those provider tabs without renderer-local string
  derivation. OpenCode Settings strings were removed with the embedded runtime
  migration because the Settings tab/card no longer exists.
- Session rollback/cache status labels (`session.status.tokens`,
  `session.status.cache`, `session.status.turns`, `session.status.rollback`)
  are approved `ui_labels` source strings for the visible Codex-only validation
  controls.
- The subagent launch divider label (`session.subagents.launched`, "Subagents
  launched") is the only approved `ui_labels` source string for the dialog
  timeline divider; it replaced the retired `session.subagents.started` card
  title when the per-launch info cards collapsed into one divider line
  (user request 2026-07-13).
- GLM universal-client provider help
  (`settings.provider.glmClient.description`,
  `settings.provider.glmClient.apiKey.description`) is part of the approved
  `ui_helper_text` dictionary, and the API-key/default-model card titles
  (`settings.provider.glmClient.apiKey`, "Z.ai Coding Plan API Key";
  `settings.provider.glmClient.defaultModel`, "GLM Default model") are part of
  the approved `ui_labels` dictionary. The GLM client default-model helper and
  model descriptions (`settings.provider.glmClient.defaultModel.description`,
  `settings.provider.glmClient.model.*.description`) are approved
  `ui_helper_text` source strings for the Settings model rows.
- Local Models universal-client provider help is part of the approved
  dictionaries: the connection card title
  (`settings.provider.localModelsClient.connection`, "Local Models Server"),
  the per-model context control labels
  (`settings.provider.localModelsClient.contextLength` "Context Length",
  `.contextLength.apply` "Apply Context") and the model-row meta labels
  (`.maxContext` "max", `.loadedContext` "loaded", `.tools` "tools") in
  `ui_labels`, the reload progress message
  (`.contextLength.applying`, "Reloading...") in `messages_for_the_user`,
  and the card copy
  (`settings.provider.localModelsClient.description`,
  `.baseUrl.description` — server root or `/v1` prefix both accepted,
  `.contextLength.description` — manual window override, 0 = auto-detect) in
  `ui_helper_text`. The `.apiKey.description` string was removed together
  with the API key field (2026-07-05 user review fix).
- The OpenRouter model search refresh control label
  (`settings.openRouter.searchRefresh`) is part of the approved `ui_labels`
  dictionary; it names the icon button that re-runs the model slug search and
  reopens the collapsed match list.
- The project workflow UI copy is part of the approved dictionaries:
  `ui_labels` holds the sidebar items (`sidebar.newProject`,
  `sidebar.openProject`, `sidebar.projectDoctor`, `sidebar.removeProject`),
  the New/Open Project
  dialog (`project.setup.*`), the git identity form of that dialog and of
  Project Doctor (`project.identity.name`, `.email`, `.save` — "Save and
  continue"), Project Doctor (`project.doctor.*`, one label
  per doctor check id and status), the workflow status strip
  (`workflow.strip.*`, including `workflow.strip.label` and
  `workflow.strip.continuing`; the strip has no autopilot switch, so
  `workflow.strip.autopilot` and its description are gone), one label per
  autopilot stop reason (`workflow.autopilot.reason.<reason>`, including
  `paused` — "Paused" — and the orchestration reasons
  `waiting-for-executors` and `waiting-for-mode-choice`) and the
  execution mode card
  (`workflow.modeCard.label`, `.question`, `.recommended`, `.choose`,
  `.chosen`, `.sent`, `.option.<sequential|orchestrated|refine>`), the
  sidebar plan panel (`workflow.plan.title`, `.parallel`, `.sequential`,
  `.progressOf`, `.progressDone`, `.state.<ACTIVE|BLOCKED>`,
  `.taskStatus.<DONE|IN_PROGRESS|TODO>`, and the pause button
  `.pause` "Pause", `.pausing` "Pausing after the current task",
  `.continue` "Continue") and the plan owner card role
  (`sidebar.role.agent`, `sidebar.role.orchestrator`);
  `ui_helper_text` explains every
  inspected folder state (`project.state.<STATE>`, `project.state.nested`),
  the dialogs, the git identity form (`project.identity.description`) and
  the card (`workflow.modeCard.hint`,
  `workflow.modeCard.option.<id>.description`) and the executor row of the
  plan panel (`workflow.plan.openExecutor`); `messages_for_the_user`
  holds `project.setup.nameRequired` and `workflow.modeCard.saving`.
- The Native Request Capture card copy is part of the approved dictionaries:
  `ui_labels` (`settings.nativeCapture.title`/`.provider`/`.model`/
  `.reasoning`/`.capture`/`.markdownPath`/`.jsonlPath`, where `.jsonlPath`
  labels the raw JSONL upstream-request artifact), `ui_helper_text`
  (`settings.nativeCapture.description`, which describes local sensitive
  artifacts and does not claim capture-and-abort behavior for Codex's
  forward-transit path), and `messages_for_the_user`
  (`settings.nativeCapture.capturing`/`.failed`/`.done`).
- Subagent tree controls, live status labels, inline call cards, child-session
  breadcrumb/read-only copy and session rename/regenerate controls are approved
  English source strings in the category dictionaries. The normal Core
  localization materializer resolves configured languages such as Russian;
  renderer fallbacks remain the same English source copy.
- Settings localization refresh blocker copy is part of the approved
  `messages_for_the_user` dictionary so the blocking save feedback itself can
  be localized.
- Profile Creator settings copy (`settings.tab.profileCreator` and the
  `settings.profileCreator.*` ids used by the `profile-settings-ui` module:
  tab label, intro card, provider-scoped New Profile form labels/placeholder,
  profiles list kind/applicability/validity labels, legacy universal read-only
  copy, and status messages) is part of the approved `ui_labels`,
  `ui_helper_text` and `messages_for_the_user` dictionaries.
- Glossary preserve/preferred-translation rules.
- User-managed do-not-translate terms.
- Translation facade for materializing non-English UI bundles.
- Localization bundles.

## Outputs

- Source dictionary strings for stable message ids.
- Default source registry backed by bundled English dictionaries.
- Glossary-protected text and restored translated text.
- User glossary overrides from `do-not-translate-terms.txt`. Each non-comment
  line is either a plain term (kept untranslated as a `preserve` rule) or
  `Source Term - Desired translation` (parsed into a `preferred_translation`
  rule via `UserGlossaryStore`'s `TRANSLATION_SEPARATOR`, `" - "`, split on the
  first occurrence). User-provided preferred translations use
  `GLOSSARY_ANY_TARGET_LANGUAGE` (`"*"`) as their `targetLanguage`, so
  `GlossaryProtector` applies them regardless of which specific non-English
  language a category is currently translating into, instead of requiring a
  per-line language tag. The seeded file created by
  `ensureEditableGlossaryFile()` includes a couple of examples of both forms.
- Materialized runtime bundles are cached under
  `Localization/catalogs/<category>/<language>.json`, and the browser bootstrap
  payload is cached under `Localization/cache/browser-runtime-bootstrap.json`.
  The Core Runtime Process supplies the Harness home `Localization` root for
  packaged-app browser runtime payloads.
- Cache reuse is keyed by both the localization settings snapshot and the
  source dictionary fingerprint. Per-category bundles also store that
  fingerprint, the resolved `engineId` and `sourceEntries` (the English source
  text of every successfully translated entry). A bundle whose fingerprint
  matches and whose `source` is `materialized` is reused whole. Otherwise the
  refresh is incremental: for the same target language and engine, an entry
  whose source text equals its `sourceEntries` record keeps the cached
  translation, and only new, changed, missing or previously failed entries go
  to the translation engine. Adding or changing approved source strings
  therefore translates exactly the affected keys in every non-English
  category; switching the UI Translation Engine (or a cached file of the older
  format without `sourceEntries`) retranslates the whole bundle instead of
  reusing content translated by a previous engine.
- A bundle with failed entries keeps the English source text for them, reports
  `error` and `source: "source_fallback"`, and is still written with the
  `sourceEntries` of its translated entries, so the next pass retries only the
  failed ones. The bootstrap payload is cached only when no bundle has an
  `error`, so a transient engine failure never pins English text in
  `browser-runtime-bootstrap.json` until the next source or settings change.
- Translation is machine-made by the provider translation engines; there is no
  curated per-language dictionary layer. The renderer looks a message id up in
  the bundle of the category it names and falls back to its English bootstrap
  string, so the shown language of a string is the language configured for its
  category (for example, `ui_labels` follows the General "UI Labels" setting,
  `ui_helper_text` follows "UI Helper Text").
- Selective materialization for settings changes that affect UI bundles.
- Runtime payload with active engine id, available engine catalogs, and
  category-keyed bundle entries.
- Missing key diagnostics.
- `LocalizationRuntimeFacade.materializeRuntimePayload` and
  `LocalizationMaterializer.materializeRuntimePayload`/`materializeBundle`
  accept an optional `force` flag. Glossary content is not part of the cache
  key (only `settings`/`sourceFingerprint`/`engineId` are), so editing the
  do-not-translate glossary alone never invalidates an already-materialized
  bundle; `force: true` skips the cache reads for one materialization pass
  (still writing the fresh result to cache afterward as normal) so a caller
  can force a full retranslation of every entry on demand.

## Owned Paths

- `module.md`
- `src/**`
