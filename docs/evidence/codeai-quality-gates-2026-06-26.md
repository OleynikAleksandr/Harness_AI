# CodeAI Quality Gates Evidence - 2026-06-26

## Scope

Transferred the CodeAI Hub quality gate baseline into the Harness AI workspace:

- Ultracite/Biome lint and formatting.
- Knip unused-file/export checks with Harness facade entry points.
- jscpd duplication checks.
- Markdown link checks over repo-owned markdown files.
- Production dependency security audit.
- Plan validation inside Git hooks.

## Verified Commands

```bash
sh .husky/pre-commit
```

Result: PASS.

- `npm run plan:validate`: OK.
- `npm run check:architecture`: OK, 3 product parts, 12 clusters, 49 modules.
- `npm run lint`: OK, Ultracite checked 58 files.
- `npm run check:knip`: OK. Knip reports configuration hints only.
- `npm run typecheck`: OK.
- `npm test`: OK, 1 runnable test.

```bash
sh .husky/pre-push
```

Result: PASS.

- `npm run plan:validate`: OK.
- `npm run check:dup`: OK, duplicate percentages are below thresholds.
- `npm run check:security`: OK, 0 production vulnerabilities.
- `npm run check:links`: OK.

```bash
npm run build
```

Result: PASS.

- Runtime TypeScript build completed.
- Vite renderer production build completed.

## Notes

- `.harness/runtime/**` and `.codeai-hub/**` remain local runtime state and are not link-check inputs.
- The first Ultracite normalization was committed with the quality tooling baseline.
