# Project Workflow UI Cluster

## Boundary

Owns the Application Shell presentation of the project workflow (Workflow
Kit): creating and opening projects, the one-time git identity form, the
project doctor, the workflow status strip, and the execution mode card and
the plan in the sidebar. It renders Core read models (inspection, Kit
status, doctor report, autopilot snapshot, mode card, plan view) and
forwards user intents through the `window.harnessCore` bridge. Inspection,
installation, identity validation, plan, status, doctor, autopilot, mode
choice and executor binding truth stay in Core and the Kit
(`docs/architecture/workflow-kit/WorkflowKitInstallation.md`, section 5.6;
`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`, sections 4.2
and 10.2; `docs/architecture/ReleaseFixes-2026-11-04-2.md`, sections 1–3).

## Owned Modules

- `project-setup-dialog` — New Project (parent folder + name) and Open
  Project (folder only, named after itself; Core inspection,
  install/update/open, Open Without Kit). On `GIT_IDENTITY_REQUIRED` it
  shows the git identity form (`GitIdentityForm`, name and email sent to
  `setGitIdentity`, validated by the Kit) and then repeats the same
  preparation.
- `project-doctor-panel` — the Core doctor report of the active workspace
  and the safe fix; a failing unfixable `git-identity` check shows the same
  identity form, then the doctor fix.
- `workflow-status-strip` — scope, task, progress and the autopilot switch
  with its last stop reason, kept current by Core events.
- `execution-mode-card` — the Core execution mode card of a scope proposal
  in the left sidebar under the owner session's card, in the plan slot
  (mounted by `session-sidebar`); it forwards the clicked option.
- `project-plan-panel` — the Core plan view under the owner session's card
  in the sidebar (mounted by `session-sidebar`, hidden while the mode card
  waits for the choice); an executor row opens its session.

## Shared Assets

- `src/project-workflow-ui.css` — dialog, panel and strip styles on the
  shared `--pm-*` dark theme tokens; the mode card and the identity form
  reuse its button styles.

## Facade Rule

Modules never read the filesystem, run the Kit, derive workflow state or
match sessions to tasks; labels for Core values (inspect action, doctor
status, stop reason, mode option, task status) come from the approved
localization dictionaries.
