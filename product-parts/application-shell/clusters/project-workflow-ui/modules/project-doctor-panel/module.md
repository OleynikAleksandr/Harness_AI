# Project Doctor Panel Module

## Responsibility

The Project Doctor of the active workspace: it shows the Core doctor
report and lets the user run the safe fix. Core runs the Workflow Kit
doctor and the fix; the panel only renders the result.

## Public Facade

`ProjectDoctorPanelFacade` (`src/project-doctor-panel-facade.tsx`), props
`{workspace, onClose}`.

## Inputs

- `window.harnessCore.runProjectDoctor({workspaceId, fix})` — the Core
  doctor report (`checks[]` with `id`, `status` ok/warn/fail, `message`,
  `nextAction`, `fixable`) or a Kit failure envelope.
- `GitIdentityForm` and `failureText` of `project-setup-dialog`, through
  its facade.

## Outputs

- On open the doctor runs once; "Check Again" runs it again.
- Each check shows a status icon, the localized check label
  (`project.doctor.check.<id>`), the localized status
  (`project.doctor.status.<status>`), the Core message and next action.
- A `git-identity` check that fails and is not fixable (no real global
  identity to copy) shows the git identity form of `project-setup-dialog`
  under its message instead of the terminal commands of its next action.
  After the form saved the global identity, the panel runs the doctor with
  `fix: true`, which copies it into the repository config, and shows the
  new report.
- "Fix" is offered only when a fixable check is not `ok`; it runs the
  doctor with `fix: true` (Core restores managed files, hooks and modes in a
  `kit-update` commit) and shows the new report.
- Failures appear in an in-app alert (message, then the next action on its
  own line unless the message contains it); a pending state blocks the actions;
  Escape closes the panel when nothing runs. No native dialogs.

## Tests

- `src/project-doctor-panel.test.mjs` — bridge calls, fix gating, localized
  labels, the identity form of a failing unfixable `git-identity` check
  (import through the setup dialog facade, fix after saving) and the dialog
  contract.

## Owned Paths

- `module.md`
- `src/**`
