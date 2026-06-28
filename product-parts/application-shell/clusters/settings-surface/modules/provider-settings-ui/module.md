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

## Reasoning Effort Select

- `ReasoningEffortSelect` renders its open menu through a React portal on `document.body`, positioned from the trigger's bounding box, so the menu overlays the whole settings dialog instead of being clipped by `overflow: hidden` ancestors or the model-row grid. It closes on outside click, Escape, scroll, or resize.
- The menu options come from `REASONING_EFFORT_OPTIONS`. The optional `values` prop limits the rendered levels to a per-model set; without it, `ultracode` is hidden (Opus-only level).
- The Claude card reads `CLAUDE_REASONING_EFFORTS_BY_MODEL` from Core to pass each alias its supported levels (Opus gets ultracode, Sonnet drops xhigh) and renders "Not adjustable" instead of a selector for Haiku. The Codex card keeps the default set, so it never shows `ultracode`.

## Owned Paths

- `module.md`
- `src/**`
