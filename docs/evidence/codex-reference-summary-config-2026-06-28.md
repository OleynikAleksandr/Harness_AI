# Codex App-Server Summary Config Verification - 2026-06-28

## Reference Finding

- CodeAI-Hub runtime settings keep `providers.codex.reasoningSummaryEnabled = true`.
- CodeAI-Hub Codex provider home keeps `model_reasoning_summary = "none"`.
- Visible Codex reasoning is controlled per turn by app-server request params, not by provider-home TOML.
- CodeAI-Hub forces Spark turns to `summary: "none"` while non-Spark turns can use `summary: "detailed"` when settings enable summaries.

## Harness Result

- 2026-07-08 update: Harness now materializes one top-level
  `model_reasoning_summary = "detailed"` and removes legacy/default summary
  lines. This intentionally diverges from the earlier CodeAI-Hub reference
  finding because the packaged Codex app-server retest showed no visible
  reasoning in the dialog while the provider home still forced `none`.
- Codex `turn/start` still sends per-turn `summary: "detailed"` when enabled for supported models.
- Codex Spark keeps reasoning effort selection but sends per-turn `summary: "none"`.
- Codex settings capabilities align with the reference model list: GPT-5.2, GPT-5.3 Codex Spark, GPT-5.4 Mini, GPT-5.4, and GPT-5.5 expose `low`, `medium`, `high`, and `xhigh`, defaulting to `medium`.

## Verification Commands

```bash
node product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.test.mjs
node product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.test.mjs
node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/codex-provider-facade.test.mjs
npm test
npm run check:dup
npm run check:security
npm run check:links
npm run package:mac
```

## Packaged App

- Verified path exists: `release/mac-arm64/Harness AI.app`
