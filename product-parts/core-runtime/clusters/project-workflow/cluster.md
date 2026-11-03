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

Further modules (`workflow-git`, `workflow-quality`,
`workflow-recovery`, `workflow-autopilot`, `workflow-kit`,
`workflow-installer`, `workflow-host`) are added by the active plan in that
order.

## Test Support

`workflow-platform/src/workflow-test-build.mjs` transpiles the requested
cluster modules into `.harness/runtime/<label>-test-*` for every module test
of this cluster.
