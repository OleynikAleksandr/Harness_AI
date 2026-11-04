# Harness AI

Harness AI is a standalone Electron application for software-product development through a classic chat surface and a strict Product Part / Cluster / Module architecture tree.

This repository is intentionally new. CodeAI Hub is reference material only; Harness AI modules are written fresh under `product-parts/**`.

## Bootstrap Status

- Product tree source: `.harness/product-tree/product-tree.json`.
- Human projection: `.harness/product-tree/product-tree.md`.
- Active local plan (Workflow Kit): `.harness/plans/todo-plan.md`.
- Production code root: `product-parts/**`.

MVP starts with the workspace skeleton, then installs the local development harness, then implements the first runnable Electron session slice.

## Development Process

The development process runs on the Harness Workflow Kit (`scripts/workflow`,
specification in `docs/architecture/workflow-kit/WorkflowKit.md`). The plan in
`.harness/plans/todo-plan.md` changes only through Kit commands:

- `scripts/workflow recover --format text` — recovery packet for a new session;
- `scripts/workflow task:start <ID>` and `scripts/workflow commit --task <ID>` —
  one task, one checked commit;
- `scripts/workflow accept --note "<the user's words>"` — records the user's
  acceptance and keeps the scope active;
- `scripts/workflow close --scope <id> --note "<command>"` — a separate
  user-directed closeout.

Quality checks come from the Kit profile in `.harness/workflow/config.json`
and run in the Kit Git hooks (`.husky/**`).

## Packaged App Rebuilds

Use `npm run package:mac` when a change must be tested in
`release/mac-arm64/Harness AI.app`. The script first runs
`scripts/stop-packaged-app-processes.mjs`, which stops only running processes
launched from this repository's packaged app path before rebuilding `app.asar`.
This prevents an already-running packaged Core from continuing to serve an old
runtime after the package has been rebuilt.

The package also carries the Workflow Kit bundle
(`dist/workflow-kit/workflow.mjs`, built by `npm run build:workflow-kit` as part
of `npm run build`) as the `workflow-kit` resource. Core runs it with the
Electron binary as Node (`ELECTRON_RUN_AS_NODE=1`) to inspect, install, update
and diagnose projects opened through New Project / Open Project.
Projects installed or updated by the app carry the Harness host marker: their
agent proposes each scope and the user chooses on a card in the left sidebar,
under the owner session, whether one agent runs it (`sequential`) or Claude subagent executors run its tasks in
their own worktrees (`orchestrated`); the choice turns on the autopilot, and
the sidebar shows the active plan with live progress
(`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`). When git has
no real name and email, the New/Open Project dialog asks for them once and
saves them to the global git config through the Kit (`identity:set`).

## License

MIT — see `LICENSE`.
