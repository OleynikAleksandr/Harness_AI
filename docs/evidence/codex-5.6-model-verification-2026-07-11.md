# Codex 5.6 Model Verification — 2026-07-11

## Scope

Update the Harness AI Codex app-server model catalog after the provider removed
GPT-5.2 and introduced GPT-5.6 Sol, Terra, and Luna. Align per-model reasoning
capabilities and make the Codex Native Request Capture diagnostic use the
reasoning effort stored in provider Settings for the selected capture model.

This slice changes the native `codex` app-server catalog. The separate

## Provider contract observed

- Installed client: `codex-cli 0.144.1`.
- Source: authenticated app-server `model/list` with `includeHidden: false`.
- The visible order is GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, GPT-5.5,
  GPT-5.4, GPT-5.4 Mini, GPT-5.3 Codex Spark.
- GPT-5.2 is absent.
- Sol and Terra support `low`, `medium`, `high`, `xhigh`, `max`, `ultra`.
- Luna supports `low`, `medium`, `high`, `xhigh`, `max`.
- The GPT-5.6 default effort is `medium`; Sol is the provider default model.
- Spark's current provider default effort is `high`.

The public app-server contract documents `model/list` as the authority for
`supportedReasoningEfforts` and `defaultReasoningEffort`:
<https://learn.chatgpt.com/docs/app-server#list-models-modellist>.

## Live calls

Each probe started a fresh authenticated app-server thread with
`persistExtendedHistory: false`, sent `Reply with exactly OK. Do not use
tools.`, waited for `turn/completed`, and recorded only terminal output and
usage metadata.

| Model | Effort | Catalog support | Terminal status | Final answer | Reasoning output tokens | Context window |
| --- | --- | --- | --- | --- | ---: | ---: |
| `gpt-5.6-luna` | `max` | yes | `completed` | `OK` | 22 | 353400 |
| `gpt-5.6-terra` | `ultra` | yes | `completed` | `OK` | 0 | 353400 |
| `gpt-5.6-sol` | `ultra` | yes | `completed` | `OK` | 0 | 353400 |

The zero reasoning-token count on the deliberately trivial Terra/Sol prompt
does not mean the effort was rejected: `model/list` advertises `ultra`, the
backend accepted the turn, and both turns completed. Effort is a ceiling/mode;
it does not force hidden reasoning work when the request does not need it.

## Harness verification

- Settings normalization removes GPT-5.2, adds the three GPT-5.6 ids, preserves
  per-model efforts, and exposes `ultra` only for Sol/Terra.
- The Settings picker and approved localization dictionary use the live model
  order and provider descriptions.
- The Core `list-capturable-models` catalog exposes the same Codex model order.
- `capture-native-request` resolves the selected model's normalized
  `providers.codex.reasoningByModel` value and passes it into the dedicated
  diagnostic `CodexProviderFacade`; the capture service already serializes
  that workspace default as app-server `turn/start.effort`.
- Focused settings/UI/catalog/Core capture tests passed.
- Every implementation commit passed the repository commit gates (`lint`,
  architecture, Knip, typecheck, and 81 test groups).
- `npm run build` passed and emitted the GPT-5.6 catalog plus `ultra` handling
  into `dist/runtime` and the renderer bundle.

## Packaging boundary

`npm run package:mac` was not run in this slice because rebuilding the packaged
application requires explicit user confirmation. The source/runtime build and
live provider calls are complete; packaged UI acceptance remains a separate
user-approved step.
