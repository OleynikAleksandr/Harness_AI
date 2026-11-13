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
- `scripts/workflow schema <command>` — the JSON input of a command with its
  limits and an example; `scripts/workflow context <path>[#Heading]` —
  documents as marked text in one call (`context --list` for the map);
- `scripts/workflow task:start <ID>` and `scripts/workflow commit --task <ID>` —
  one task, one checked commit;
- `scripts/workflow accept --note "<the user's words>"` — records the user's
  acceptance and keeps the scope active;
- `scripts/workflow close --scope <id> --note "<command>"` — a separate
  user-directed closeout.

Quality checks come from the Kit profile in `.harness/workflow/config.json`
and run in the Kit Git hooks (`.husky/**`).

## Packaged App Rebuilds

Choose an unused release tag before packaging and run
`HARNESS_RELEASE_TAG=v2026.11.13.2 npm run package:mac` when a change must be tested in
`release/mac-arm64/Harness AI.app`. The launcher validates the tag, then runs
`scripts/stop-packaged-app-processes.mjs`, which stops only running processes
launched from this repository's packaged app path before rebuilding `app.asar`.
This prevents an already-running packaged Core from continuing to serve an old
runtime after the package has been rebuilt.

The native About window shows the full application release version and a
separately labeled bundled Workflow Kit version, even without an open project.
Core validates the immutable `dist/build-info.json` resource and reads its Kit
version through the cluster facade. Packaging derives the real package version
and macOS build number from the same release tag without editing the source
`package.json.version`. Development builds explicitly display Development.
See [ApplicationVersionsAndAbout-2026-11-13.md](docs/architecture/ApplicationVersionsAndAbout-2026-11-13.md).

Workflow Kit sources are synchronized to **2.2.4** from Workflow_Kit,
commit `6e05505f`. Harness keeps the Core-owned cluster, Vite bundle and
module-local `src/**` tests. The synchronization specification is
[WorkflowKitSync-2.2.4-2026-11-13.md](docs/architecture/WorkflowKitSync-2.2.4-2026-11-13.md).

The package also carries the Workflow Kit bundle
(`dist/workflow-kit/workflow.mjs`, built by `npm run build:workflow-kit` as part
of `npm run build`) as the `workflow-kit` resource. Core runs it with the
Electron binary as Node (`ELECTRON_RUN_AS_NODE=1`) to inspect, install, update
and diagnose projects opened through New Project / Open Project.
Projects installed or updated by the app carry the Harness host marker: their
agent proposes each scope and the user chooses on a card in the left sidebar,
under the owner session, whether one agent runs it (`sequential`) or Claude subagent executors run its tasks in
their own worktrees (`orchestrated`). The autopilot is on by default and
continues the plan task by task; the sidebar shows the active plan with live
progress and a Pause / Continue button (the task in progress always
finishes, the next one waits)
(`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`). When git has
no real name and email, the New/Open Project dialog asks for them once and
saves them to the global git config through the Kit (`identity:set`).

The app has no built-in project: on the first start, or after the last
project is removed, it shows a start screen with Open Project and New
Project, and any project can be removed from the project menu (the folder
stays on disk).

## License

MIT — see `LICENSE`.
