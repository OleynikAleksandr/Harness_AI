# Reasoning Effort Menu Verification - 2026-06-27

## Scope

- Replaced native reasoning effort selects in Codex and Claude model rows with an in-app dark menu.
- Kept writes on the same Settings fields: Codex `reasoningByModel` and Claude `thinkingByModel`.
- Menu closes on outside click and Escape.

## Verification

- `npm run plan:validate` - OK.
- `npm run check:architecture` - OK.
- `npm run lint` - OK.
- `npm run typecheck` - OK.
- `npm test` - OK.
- `npm run package:mac` - OK.
- Verified `release/mac-arm64/Harness AI.app` exists.

