# Next Session Mode UI Evidence - 2026-06-28

## Scope

Implemented the `Next Session Mode` UI and Core contract for the current native baseline.

## Runtime Behavior

- Active next-session behavior is `Native · Raw`.
- Managed, normalized, Auto Normalizer, and User Profile entries are preview-only UI labels.
- Session creation submits the native raw baseline.
- Core resolves next-session mode input to the native raw baseline.

## Verification

- `npm run plan:validate` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run check:knip` - OK, existing configuration hints only
- `npm run typecheck` - OK
- `npm test` - OK, 31 tests
- `npm run check:dup` - OK, reports existing exact clone counts with exit code 0
- `npm run check:security` - OK, 0 high production vulnerabilities
- `npm run check:links` - OK
- `npm run build` - OK
- `npm run package:mac` - OK

## Packaged App

- `release/mac-arm64/Harness AI.app` exists after packaging.
