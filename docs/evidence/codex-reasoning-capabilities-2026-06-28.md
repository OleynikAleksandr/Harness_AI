# Codex Reasoning Capabilities Verification - 2026-06-28

## Scope

- `65d531d fix: use codex reasoning capabilities`
- `b70f0c9 fix: show codex reasoning controls by capability`

## Result

- Codex reasoning effort is resolved by the Core settings-store Codex capability contract, not by Claude/default ranks.
- GPT-5.3 Codex Spark resolves to the model-specific default `high`.
- GPT-5.4 Mini, GPT-5.4, and GPT-5.5 resolve to `medium` when no stored valid value exists.
- GPT-5.2 has no declared reasoning levels in the local Codex model cache and resolves to no effort; Core omits `reasoningEffort` for that model.
- The settings UI reads Codex capabilities from Core, filters each selector to the model-supported values, and renders `Not adjustable` for models without declared levels.
- The session window no longer displays a synthetic `(medium)` Codex label when Core resolves no effort.

## Verification Commands

```bash
node product-parts/core-runtime/clusters/settings-and-localization/modules/settings-store/src/settings-normalization.test.mjs
node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/provider-turn-options.test.mjs
node product-parts/application-shell/clusters/settings-surface/modules/provider-settings-ui/src/codex-default-model-card.test.mjs
node product-parts/application-shell/clusters/session-interface/modules/session-window/src/reference-session-panels.test.mjs
npm test
npm run check:dup
npm run check:security
npm run check:links
npm run package:mac
```

## Packaged App

- Verified path exists: `release/mac-arm64/Harness AI.app`
