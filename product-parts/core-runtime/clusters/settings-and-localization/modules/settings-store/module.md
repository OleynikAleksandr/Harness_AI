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
- `CLAUDE_REASONING_EFFORTS_BY_MODEL` (exported from `settings-normalization`, not the `node:fs`-backed facade, so the renderer can import it without bundling persistence) is the source of truth for which efforts each Claude alias exposes: Opus full set + ultracode, Sonnet without xhigh, Haiku none. The settings UI reads this map to filter the per-model selector.
- `normalizeSettings` validates per-model Claude efforts against the whitelist and falls back to the provider default effort when a stored value is unknown.
- Codex does not reuse Claude effort ranks. `CODEX_REASONING_EFFORTS_BY_MODEL` and `resolveCodexReasoningEffort` own Codex model capabilities: GPT-5.3 Codex Spark defaults to `high`, current GPT-5.4/5.5 models default to `medium`, and models without declared reasoning levels resolve to no effort so Core does not send an unsupported provider option.

## Owned Paths

- `module.md`
- `src/**`
