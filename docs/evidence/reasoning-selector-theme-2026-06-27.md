# Reasoning Selector Theme Evidence - 2026-06-27

## Scope

- Model-row reasoning selectors use dark form styling instead of the default light native control.
- Claude settings now show a reasoning selector beside every Claude model row.
- Claude per-model reasoning is stored as `settings.providers.claude.thinkingByModel[modelId]`.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm run check:architecture`
- `npm run build`
- `npm run package:mac`
- `test -d "release/mac-arm64/Harness AI.app"`

## Result

- Checks pass.
- Packaged macOS app exists at `release/mac-arm64/Harness AI.app`.
