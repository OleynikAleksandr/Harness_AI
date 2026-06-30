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
- Harness-owned provider path labels; the OpenCode card points users to `.harness/runtime/providers/glm-opencode/home`.
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
- Localization translation engine selects show only engines registered in the
  current Harness runtime. OpenRouter/Codex/Claude localization engines are not
  displayed until their provider-backed translation engines exist in
  `ProviderTranslationEnginesFacade`.
- Settings shell copy, provider tab labels, and the first shared provider-card
  labels/helpers resolve through the browser localization provider and approved
  source dictionary ids.
- Remaining Settings provider helper copy resolves through the same browser
  localization provider, including session continuity helper text, GLM default
  model helper text, OpenCode helper text/model descriptions, Local Models
  helper/empty-state text, OpenRouter helper text, endpoint latency helper copy,
  and the initial Restart App status message.
- Dynamic OpenRouter model descriptions returned by OpenRouter search are not
  added to static dictionaries. They are sent to Core through
  `translateDynamicText`, which uses the Reasoning Translation Engine target and
  returns translated text for the visible model rows.
- Claude default-model helper copy, thinking descriptions, model descriptions,
  and new-session note resolve through the browser localization provider instead
  of hardcoded Russian text, so Claude follows the same UI Helper Text language
  selection as the rest of Settings. Claude alias descriptions stay
  version-neutral; the Sonnet helper copy does not include a concrete
  Anthropic model id because the alias should track the current underlying
  model.
- Codex default-model helper copy, reasoning summary description, model
  descriptions, and new-session note also resolve through the browser
  localization provider.
- Kimi default-model row descriptions resolve through the browser localization
  provider; the card description and note already use the same boundary.
- When the dialog opens, and after a successful settings save or workspace
  settings reset, the facade calls the parent-provided localization runtime
  refresh callback so newly materialized bundles are visible even when there are
  no dirty Settings changes to save.
- Shared native select controls commit both `input` and `change` events so
  language/category selections immediately mark the Settings draft dirty and
  enable Save Changes.

## Reasoning Effort Select

- `ReasoningEffortSelect` renders its open menu through a React portal on `document.body`, positioned from the trigger's bounding box, so the menu overlays the whole settings dialog instead of being clipped by `overflow: hidden` ancestors or the model-row grid. It closes on outside click, Escape, scroll, or resize.
- Because the portal renders outside `.settings-backdrop`, the scoped `--ss-*` tokens do not resolve inside it, so `.settings-reasoning-menu` uses literal popup-elevation values instead of tokens: an opaque surface `#313438` (a few steps lighter than the model cards `#232527`, so the menu stands off the surface below it) and a lighter border `#4d5258`. This also keeps the menu fully opaque rather than falling back to `transparent`.
- The menu options come from `REASONING_EFFORT_OPTIONS`. The optional `values` prop limits the rendered levels to a per-model set; without it, `ultracode` is hidden (Opus-only level).
- The Claude card reads `CLAUDE_REASONING_EFFORTS_BY_MODEL` from Core `settings-normalization` (a persistence-free module, so the renderer bundle stays clean of `node:fs`) to pass each alias its supported levels (Opus gets ultracode, Sonnet drops xhigh) and renders "Not adjustable" instead of a selector for Haiku.
- The Codex card reads `CODEX_REASONING_EFFORTS_BY_MODEL` and `resolveCodexReasoningEffort` from the same Core module. Codex selectors show only the levels declared for that Codex model and use Core defaults. Summary support is separate from effort selection; Spark still exposes effort levels but the provider disables per-turn summaries for it.
- Provider model cards render the model label and description only; the raw model id (which duplicated the label, e.g. "Sonnet" / "sonnet") is no longer shown in the Claude, Codex and reference cards. OpenRouter keeps its `settings-model-id` span because there it carries routing/metric text (e.g. "default routing", endpoint metrics), not a duplicate name.
- The shared `ProviderVersionsCard` update button shows a `settings-spinner` next to the "Updating to ..." label while a CLI/SDK target is updating (driven by `updatingTargets`), so every provider with manual updates has the same in-progress feedback until the current version refreshes.

## Settings Surface Styling

- `settings-surface.css` defines scoped `--ss-*` design tokens on `.settings-backdrop`; the global `--pm-*` tokens in `session-window.css` are left unchanged, so this restyle is contained to the settings dialog and shared by every provider tab through the common classes.
- Neutral graphite palette with three elevation levels: dialog/content (`--ss-bg`) is the darkest surface, the section block `.settings-card` (`--ss-block`) sits one step lighter, and the model/version cards `.settings-model-row` / `.settings-version-row` (`--ss-card`) are lighter still. Card borders (`--ss-card-border`) are value-matched to the field borders so they read with the same weight on their respective surfaces.
- Selection is teal by tone, not by brightness: the selected model (`.settings-model-row.active` / `.settings-option-row.active`) and the active provider tab (`.settings-tab.active`) use a muted teal fill (`--ss-sel`) at the same lightness as the neutral cards plus a thin muted teal border (`--ss-sel-border`); the bright accent dot stays as the radio indicator.
- Reasoning fields (`.settings-reasoning-trigger`) and text fields are in-tone with their row — one step lighter than the card (`--ss-field`) — and switch to a teal-tinted fill (`--ss-field-sel`) on the active model, instead of the previous near-black field. Toggle rows are borderless rows inside the block rather than separate framed boxes.
- Text hierarchy: a layer at the end of `settings-surface.css`, scoped under `.settings-backdrop` so it outranks the element-level `font-weight: 300` reset, makes primary roles (tab labels, section titles, profile titles, model/version names, model option names, checkbox labels, and the field-label row) `font-weight: 500`, and secondary roles (descriptions, helper, notes, model id/description, version text, core status) italic + `font-weight: 300`, collapsed to one `--pm-text-muted` tone (overriding the per-rule literal greys). The shared `--pm-*` tokens lift primary brighter (`#f1f3f5`) and dim muted (`#767d86`). The italic secondary text uses a slightly brighter `--pm-text-secondary` (`#868d97`) so it reads a touch stronger than plain muted; these tokens live in `session-window.css` and are consumed here.

## Owned Paths

- `module.md`
- `src/**`
