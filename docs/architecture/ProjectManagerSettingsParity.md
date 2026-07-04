# Project Manager Settings Parity

## Goal

Harness AI settings should match the CodeAI Hub Project Manager settings surface closely enough that provider configuration, model selection, reasoning controls, localization, and Core recovery behave as one product family.

CodeAI Hub remains reference material only. Harness AI owns a new implementation under the Product Part / Cluster / Module tree.

## Included In MVP

- Provider tabs: Claude, Codex, Kimi, GLM, Local Models, OpenRouter, General.
- Provider defaults: selected model, provider update preference where applicable, thinking/reasoning display controls, and session-continuity thresholds for Claude/Codex.
- Provider-owned connection settings: GLM universal-client key/model plus the
  remaining GLM Native legacy bridge, OpenRouter API key/base URL/model/endpoint
  tag, and Local Models default model.
- General settings: Core restart control and localization configuration for UI and reasoning translation.
- Localization parity is split by runtime criticality: UI/interface/helper copy
  uses materialized browser runtime bundles, while visible reasoning/thinking
  uses late Core translation overlays that never rewrite the canonical session
  transcript.
- Settings persistence split:
  - System settings live under `~/.harness-ai/**` or `HARNESS_AI_HOME` and store machine-wide provider credentials plus global localization/core preferences.
  - Workspace settings live under `<workspace>/.harness/settings/settings.json` and store project-local provider defaults and session behavior.
- Provider adapter compatibility: saved auth/model settings must be visible to provider adapters without duplicating renderer logic.

## Excluded From MVP

- Voice interface and text-to-speech controls.
- Provider Native Request Capture controls.

## Module Ownership

- `settings-store` owns defaults, load/save/reset, global/workspace merge, and provider-auth compatibility.
- `localization-runtime` owns approved English source dictionaries, glossary
  protection and browser runtime payload materialization.
- `reasoning-translation-overlay` owns visible reasoning translation policy,
  source hashes, pending state, sidecar overlay persistence and patch payloads.
- `provider-settings-ui` owns the modal shell, provider tabs, provider cards, save/reset/close flow, and status messages.
- `localization-settings-ui` owns reusable General localization controls.
- `session-window` only opens/closes the Settings surface. It does not own settings cards.

## Acceptance

- The Settings button opens a dark Project Manager-style modal.
- All MVP tabs are visible and editable.
- Save persists settings, reload shows the saved values, and GLM/OpenRouter credentials are available to provider adapters.
- Reset restores defaults for the active workspace without deleting provider runtime homes.
- Changing UI localization settings can rebuild browser bundles; changing only
  reasoning translation engine/language affects future reasoning overlays
  without forcing UI bundle sync.
- Visible reasoning is hidden while `translationState: "pending"` is active and
  is revealed from `localizedContent` patch events when translation completes.
- The packaged unsigned macOS app includes the settings UI.
