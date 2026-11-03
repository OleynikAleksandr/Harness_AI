# Project Workflow Cluster (Workflow Kit)

## Boundary

Owns the Workflow Kit: the project development process that Harness installs
into any project. It covers the plan with scope, rounds and tasks,
transactional task commits, the bounded recovery packet, the quality
profile, git hooks, installation and the project doctor, and the autopilot
decision. The specification lives in
`docs/architecture/workflow-kit/WorkflowKit.md`.

The same TypeScript code runs in two places:
- bundled into one standalone file inside user projects, where git hooks and
  agent terminals call it without Harness running;
- driven by Core through the `workflow-host` module.

All modules except `workflow-host` import nothing outside this cluster and
use no npm packages.

## Cluster Facade

`WorkflowKitFacade` in module `workflow-kit` composes the module facades.
Other clusters use the cluster only through `WorkflowKitFacade` (in-process
pure operations) or `WorkflowHostFacade` (child-process commands from Core).

## Owned Modules

- `workflow-platform` — OS-neutral paths, atomic files, locks, process
  runner, runtime resolution, launcher texts and the shared `WorkflowError`.
- `workflow-plan` — plan model, validation, document and transitions.
- `workflow-git` — git queries, history, transactional commits, references
  and repair.
- `workflow-quality` — project quality profile: configuration, stack
  detection, check catalog, check execution and profile application.
- `workflow-recovery` — bounded recovery packet within a byte budget, the
  SessionStart hook, `show-task` and `history`.
- `workflow-autopilot` — pure continue/stop decision of the Core autopilot.
- `workflow-kit` — the cluster facade `WorkflowKitFacade`: status, scope,
  task, commit, acceptance, close, carryover, repair and quality
  operations.
- `workflow-installer` — installation payload and manifest, inspection,
  install, doctor and legacy plan migration.

Module `workflow-host` is added by the active plan.

## Test Support

- `workflow-platform/src/workflow-test-build.mjs` transpiles the requested
  cluster modules into `.harness/runtime/<label>-test-*` for every module
  test of this cluster.
- `workflow-git/src/workflow-git-test-repo.mjs` gives tests a git
  environment without the hook `GIT_*` variables.
