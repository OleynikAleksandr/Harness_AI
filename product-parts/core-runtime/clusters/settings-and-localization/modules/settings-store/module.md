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
- `ultracode` mirrors the Claude CLI orchestration mode (xhigh + dynamic workflows); it is offered only for Opus-class models, enforced by the UI capability map, not by this contract.
- `normalizeSettings` validates per-model Claude efforts against this whitelist and falls back to the provider default effort when a stored value is unknown.

## Owned Paths

- `module.md`
- `src/**`
