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

## Reasoning Effort Select

- `ReasoningEffortSelect` renders its open menu through a React portal on `document.body`, positioned from the trigger's bounding box, so the menu overlays the whole settings dialog instead of being clipped by `overflow: hidden` ancestors or the model-row grid. It closes on outside click, Escape, scroll, or resize.
- The menu options come from `REASONING_EFFORT_OPTIONS`. The optional `values` prop limits the rendered levels to a per-model set; without it, `ultracode` is hidden (Opus-only level).
- The Claude card reads `CLAUDE_REASONING_EFFORTS_BY_MODEL` from Core `settings-normalization` (a persistence-free module, so the renderer bundle stays clean of `node:fs`) to pass each alias its supported levels (Opus gets ultracode, Sonnet drops xhigh) and renders "Not adjustable" instead of a selector for Haiku.
- The Codex card reads `CODEX_REASONING_EFFORTS_BY_MODEL` and `resolveCodexReasoningEffort` from the same Core module. Codex selectors show only the levels declared for that Codex model and use Core defaults. Summary support is separate from effort selection; Spark still exposes effort levels but the provider disables per-turn summaries for it.

## Owned Paths

- `module.md`
- `src/**`
