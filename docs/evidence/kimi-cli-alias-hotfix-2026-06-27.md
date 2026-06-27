# Kimi CLI Alias Hotfix Evidence - 2026-06-27

## Scope

- Provider: Kimi.
- Symptom: Kimi CLI failed with `Model "kimi-k2.7-code" is not configured in config.toml`.
- Root cause: Harness passed the Harness-only Kimi model id as `kimi --model`, but the user config at `/Users/oleksandroliinyk/.kimi-code/config.toml` defines `models.kimi-for-coding`, not `models.kimi-k2.7-code`.

## Fix

- Kimi still reads user auth/config from the real user home through `/Users/oleksandroliinyk/.kimi-code/config.toml`.
- Kimi now launches from the workspace-local provider home resolved by `providerHomeManagerFacade.resolveProviderHome({ providerId: "kimi", workspacePath })`.
- Harness no longer passes `--model kimi-k2.7-code` to Kimi CLI; Harness model metadata remains provider-owned through the Kimi environment.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/session-provider-adapter-helpers.test.mjs`
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider/src/kimi-model-env.test.mjs`
- `npm run typecheck`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`
- `rg -n -- "--model|providerId: \"kimi\"|resolveProviderHome|cwd" dist/runtime/product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-provider dist/runtime/product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract`

Live Kimi request was not run from verification to avoid spending provider quota during packaging verification.
