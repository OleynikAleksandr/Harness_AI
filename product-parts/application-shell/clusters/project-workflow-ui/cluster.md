# Project Workflow UI Cluster

## Boundary

Owns the Application Shell presentation of the project workflow (Workflow
Kit): creating and opening projects, the project doctor and the workflow
status strip. It renders Core read models (inspection, Kit status, doctor
report, autopilot snapshot) and forwards user intents through the
`window.harnessCore` bridge. Inspection, installation, plan, status,
doctor and autopilot truth stay in Core
(`docs/architecture/workflow-kit/WorkflowKitInstallation.md`, section 5.6).

## Owned Modules

- `project-setup-dialog` — New Project (parent folder + name) and Open
  Project (folder, Core inspection, install/update/open, Open Without Kit).
- `project-doctor-panel` — the Core doctor report of the active workspace
  and the safe fix.
- `workflow-status-strip` — scope, task, progress and the autopilot switch
  with its last stop reason, kept current by Core events.

## Shared Assets

- `src/project-workflow-ui.css` — dialog, panel and strip styles on the
  shared `--pm-*` dark theme tokens.

## Facade Rule

Modules never read the filesystem, run the Kit or derive workflow state;
labels for Core values (inspect action, doctor status, stop reason) come
from the approved localization dictionaries.
