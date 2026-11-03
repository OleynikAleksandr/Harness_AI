# Workflow Quality Module

## Responsibility

The project quality profile of the Workflow Kit:
- the configuration file `.harness/workflow/config.json`: quality profile,
  documentation contracts, budgets, file policy and autopilot limit;
- validation of every check definition.

Stack detection, the check catalog, check execution and profile application
are added to this module by later tasks of the active plan.

## Public Facade

`WorkflowQualityFacade` (class, singleton `workflowQualityFacade`).

## Contract

- `configPath` — `.harness/workflow/config.json`; `configFile(root)` returns
  the absolute path.
- `defaultConfig()` — schema `harness-workflow-config/1`:
  - `quality.status` `DISCOVERY`, no stacks, no package manager;
  - required commit-stage builtins `kit:doc-size`, `kit:md-links`,
    `kit:file-lines`, `kit:docs-contracts`;
  - `docs.contracts` empty;
  - `budget.recoveryBytes` 32 000 (allowed 8 000–120 000),
    `budget.documentBytes` 28 000;
  - `policy.maxFileLines` and `policy.taskFileSoftLimit` `null` (off);
  - `autopilot.maxContinues` 40 (1–1000).
- `readConfig(root)` — a missing file yields `defaultConfig()`. Invalid JSON
  fails with `CONFIG_JSON`, an invalid shape with `CONFIG_SCHEMA`.
- `writeConfig(root, config)` validates, then writes atomically (two-space
  JSON with a trailing newline). `renderConfig(config)` returns that text.
- `normalizeCheck(input)` fills `required: false` and `timeoutMs: 120000`,
  then validates the check.
- `validateConfig(config)` rules (error `CONFIG_SCHEMA`):
  - check ids match `[A-Za-z0-9][A-Za-z0-9._:-]*` and are unique;
  - `role` is one of format, lint, typecheck, test, audit, duplication,
    links, architecture, custom, package, installed;
  - `stage` is one of prepare, commit, push, delivery;
  - exactly one of `command {executable, args[], cwd?}` or `builtin`;
  - `timeoutMs` is an integer from 1 to 600 000;
  - `appliesTo`, when present, is a list of non-empty globs;
  - `package` and `installed` checks need a non-empty `evidence`;
  - only `package` and `installed` checks run at the `delivery` stage;
  - a `CONFIGURED` profile names at least one stack;
  - every `docs.contracts` entry maps a code glob to at least one document.

## Dependencies

`workflow-platform` (atomic files, `WorkflowError`). Node built-ins only.

## Tests

`src/workflow-quality-config.test.mjs` — defaults, check normalization and
rejection, file round trip, invalid JSON.
