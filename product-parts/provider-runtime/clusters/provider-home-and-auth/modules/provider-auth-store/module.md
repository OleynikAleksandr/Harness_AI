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
- GLM universal-client key resolution: the internal `glm-client` provider reads
  the same Z.ai Coding Plan key family as GLM Native from `glmClient`/
  `glm-client` settings aliases (global `settings.json` providers section or
  `providers/glm-client/settings.json`) with `GLM_API_KEY` / `ZAI_API_KEY`
  environment fallbacks. The endpoint is key-only and provisions no provider
  home.

## Owned Paths

- `module.md`
- `src/**`
