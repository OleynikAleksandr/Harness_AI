# Provider Auth Store Module

## Responsibility

Own API key and auth references while keeping secrets outside tracked workspace files.

## Public Facade

`ProviderAuthStoreFacade`

## Inputs

- Provider auth lookup request.
- User-level auth references.

## Outputs

- Runtime auth reference.
- Missing auth diagnostics.
- Kimi universal-client key resolution: the internal `kimi-client` provider
  reads its Kimi Code subscription key from the `kimiClient`/`kimi-client`
  settings aliases (global `settings.json` providers section or
  `providers/kimi-client/settings.json`) with the `KIMI_API_KEY` environment
  variable as the Harness-convention fallback. The canonical source is a key
  pasted from the Kimi Code Console; no provider home is provisioned.
- GLM universal-client key resolution: the visible `glm-client` provider reads
  the Z.ai Coding Plan key from `glmClient`/`glm-client` settings aliases
  (global `settings.json` providers section or
  `providers/glm-client/settings.json`) with `GLM_API_KEY` / `ZAI_API_KEY`
  environment fallbacks. The endpoint is key-only and provisions no provider
  home.
- Local Models universal-client connection resolution: the visible
  `local-models-client` provider reads the `localModels`/`local-models`/
  `local` file aliases (kept under the legacy names so existing local auth
  files stay readable), `HARNESS_AI_LOCAL_API_KEY`/`LMSTUDIO_API_KEY` key
  fallbacks and `HARNESS_AI_LOCAL_MODELS_BASE_URL`/`LMSTUDIO_BASE_URL`
  base-URL fallbacks. The key is optional (local servers usually run
  no-auth); no provider home is provisioned.
- OpenRouter universal-client key resolution: the visible `openrouter-client`
  provider reads the shared OpenRouter connection — `openRouter`/`openrouter`
  file aliases with the `OPENROUTER_API_KEY` / `OPENROUTER_BASE_URL` env
  fallbacks. One key serves coding sessions AND the localization translation
  engine; the OpenRouter Settings tab is preserved as-is (2026-07-05 user
  review fix), so no new Settings copy accompanies this alias.
- The retired legacy `glm-native`/`openrouter`/`local-models` alias and env
  entries left the store with the 2026-07-05 legacy cleanup; the alias/env
  maps now carry the universal-client ids only.

## Owned Paths

- `module.md`
- `src/**`
