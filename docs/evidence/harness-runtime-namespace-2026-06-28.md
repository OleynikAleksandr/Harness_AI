# Harness Runtime Namespace Verification - 2026-06-28

## Scope

Verify that Harness AI provider runtime/home defaults no longer create
workspace `.codeai-hub/**/runtime/providers/**` directories.

## Checks

- `npm run check:dup` - passed.
- `npm run check:security` - passed.
- `npm run check:links` - passed.
- `npm run build` - passed.
- `npm run package:mac` - passed.
- Runtime path scan:
  `rg -n "\\.codeai-hub/.*/runtime/providers|\\.codeai-hub.*runtime.*providers|~/.codeai-hub/providers|path\\.join\\([^\\n]*\\"\\.codeai-hub\\"|\\"\\.codeai-hub\\"" product-parts scripts docs .harness --glob '!**/node_modules/**' --glob '!**/.harness/runtime/**'`
  returned only `scripts/check-architecture.mjs`, where `.codeai-hub` is an
  ignored local residue path.

## Packaged App

- `release/mac-arm64/Harness AI.app`
- Verified timestamp: `2026-06-28 19:05:22`
