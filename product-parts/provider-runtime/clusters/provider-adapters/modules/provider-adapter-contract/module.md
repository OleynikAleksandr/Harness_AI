# Provider Adapter Contract Module

## Responsibility

Define the shared provider adapter boundary used by Core. Adapters expose session-based operations; UI and Electron host never call provider CLIs, SDKs, or APIs directly.

## Public Facade

`ProviderAdapterContractFacade`

## Inputs

- Provider adapter descriptor.
- Provider session lifecycle requests.
- Provider turn dispatch request from Core.

## Outputs

- Provider session id.
- Provider event subscription.
- Provider lifecycle errors.
- Core-owned `turnOptions.model` applied by shared CLI/OpenAI-compatible helpers so provider sessions use the selected model for each turn.
- OpenAI-compatible final `reasoning_content` / `reasoning` fields emitted as thinking dialog messages before assistant text.
- GLM Native OpenAI-compatible turns receive Core-owned `thinking` and `reasoning_effort` request fields from turn options; other OpenAI-compatible providers do not receive GLM-only fields.
- Opt-in CLI `stream-json` output parsing for providers such as Kimi, emitting `thinking` dialog messages before assistant text when native thinking chunks are present.

## Owned Paths

- `module.md`
- `src/**`
