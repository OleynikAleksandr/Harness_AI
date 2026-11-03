# Workflow Quality Module

## Responsibility

The project quality profile of the Workflow Kit:
- the configuration file `.harness/workflow/config.json`: quality profile,
  documentation contracts, budgets, file policy and autopilot limit;
- validation of every check definition;
- stack detection and the ecosystem catalog that proposes a profile.

Check execution and profile application are added to this module by later
tasks of the active plan.

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

## Detection (`quality-detect.ts`)

- `stacks()` — `node`, `python`, `go`, `rust`, `dotnet`, `swift`, `jvm`.
- `detect(root)` scans the root and its first-level subdirectories. Hidden
  directories and `build`, `dist`, `node_modules`, `out`, `release`,
  `target`, `vendor`, `venv` are skipped. Markers:
  - node — `package.json`, `tsconfig.json`, `deno.json(c)`;
  - python — `pyproject.toml`, `setup.py`, `requirements*.txt`;
  - go — `go.mod`; rust — `Cargo.toml`;
  - dotnet — `global.json`, `*.csproj`, `*.sln`;
  - swift — `Package.swift`, `*.xcodeproj`;
  - jvm — `pom.xml`, `build.gradle(.kts)`.
- Each stack reports `{id, markers, directories, packageManager}`. The
  package manager comes from lock files in the marker directories
  (`package-lock.json` npm, `pnpm-lock.yaml` pnpm, `yarn.lock` yarn,
  `bun.lock(b)` bun, `uv.lock` uv, `poetry.lock` poetry), then from the
  `packageManager` field of `package.json`. Defaults: npm, pip, maven or
  gradle by manifest, and the toolchain name for go, rust, dotnet, swift.

## Catalog And Proposal (`quality-catalog.ts`, `quality-proposal.ts`)

- `propose(root, {stacks?, which?})` never changes the project. `stacks`
  overrides detection (error `UNKNOWN_STACK`); `which(name)` defaults to a
  PATH lookup through the platform module.
- Roles in order: `format` (prepare), `lint`, `typecheck`, `test` (commit,
  600 s timeout), `audit` (push). All proposed checks are `required`.
- Check ids are `format`, `lint`, `typecheck`, `tests`, `audit` for one
  stack and `<stack>-<id>` for several.
- Choice per role: the first catalog candidate that is already installed,
  otherwise the first candidate plus its install command.
  - node: package scripts `lint`, `test` (not the npm placeholder),
    `typecheck`/`type-check` win; binaries run through `npx`, `pnpm exec`,
    `yarn` or `bunx`; `tsc` needs `tsconfig.json` or `typescript`; the
    audit is the package manager's own.
  - python: tools declared in the manifests count as installed; tools run
    through `uv run`, `poetry run` or `python -m`.
  - go, rust, dotnet, swift, jvm: toolchain commands; separate tools
    (`govulncheck`, `cargo-audit`) carry their install command; tools
    without one get a note to install them manually.
- Missing node or python packages are grouped into one install command of
  the package manager.
- Result: `{detected, entries, notes, profile}`. `profile` has the input
  shape of `quality:apply` (`stacks`, `packageManager`, `install`,
  `checks`); `entries` lists each check's stack, role, tool, installed state
  and alternatives. Kit builtins are not part of the proposal; they stay in
  the configuration.

## Dependencies

`workflow-platform` (atomic files, `WorkflowError`). Node built-ins only.

## Tests

- `src/workflow-quality-config.test.mjs` — defaults, check normalization
  and rejection, file round trip, invalid JSON.
- `src/workflow-quality-detect.test.mjs` — node scripts and installed tools,
  install proposals, several stacks in subdirectories, explicit and unknown
  stacks.
