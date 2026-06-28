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

## Reasoning Effort Contract

- Owns the `ReasoningEffort` type: `low`, `medium`, `high`, `xhigh`, `max`, `ultracode`.
- `ultracode` mirrors the Claude CLI orchestration mode (xhigh + dynamic workflows).
- `CLAUDE_REASONING_EFFORTS_BY_MODEL` is the source of truth for which efforts each Claude alias exposes: Opus full set + ultracode, Sonnet without xhigh, Haiku none. The settings UI reads this map to filter the per-model selector.
- `normalizeSettings` validates per-model Claude efforts against the whitelist and falls back to the provider default effort when a stored value is unknown.

## Owned Paths

- `module.md`
- `src/**`
