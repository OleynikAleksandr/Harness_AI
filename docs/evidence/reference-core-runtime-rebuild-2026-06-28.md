# Reference Core Runtime Rebuild Evidence - 2026-06-28

## Scope

Plan: `reference-core-runtime-rebuild-2026-06-28`

Packaged app:

`release/mac-arm64/Harness AI.app`

## Verification Commands

- `npm run plan:validate` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run check:knip` - OK, configuration hints only
- `npm run typecheck` - OK
- `npm test` - OK, 33 tests
- `npm run check:dup` - OK, below configured threshold
- `npm run check:security` - OK, 0 high production vulnerabilities
- `npm run check:links` - OK
- `npm run build` - OK
- `npm run package:mac` - OK

## Runtime Smoke

Started the compiled Core process through the Application Shell supervisor on
port `39002`, called Core RPC, then shut it down through the Core shutdown
contract.

- `list-providers` returned all registered providers from Core.
- `list-workspaces` returned the restored workspace registry from Core.
- `POST /api/v1/shutdown` stopped the process.

## Packaged App Checks

`release/mac-arm64/Harness AI.app/Contents/Resources/app.asar` contains:

- `dist/runtime/product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-entry.js`
- `product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs`

Packaged `core-process-bridge-facade.mjs` contains `/api/v1/rpc` and does not
contain `loadRuntime` or direct provider adapter import strings.
