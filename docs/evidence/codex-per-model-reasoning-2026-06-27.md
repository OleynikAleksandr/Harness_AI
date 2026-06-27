# Codex Per-Model Reasoning Evidence - 2026-06-27

## Scope

- Codex Settings now show the reasoning effort selector in each model row.
- Each selector writes to `settings.providers.codex.reasoningByModel[modelId]`.
- The separate single Codex Reasoning card was removed.

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
