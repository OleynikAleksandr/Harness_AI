# Project Setup Dialog Module

## Responsibility

The New Project and Open Project dialog. It collects the user's folder
choice and project name and shows what Core reports; Core inspects the
folder, installs or updates the Workflow Kit and registers the workspace.

## Public Facade

`ProjectSetupDialogFacade` (`src/project-setup-dialog-facade.tsx`), props
`{mode: "new" | "open", onClose, onPrepared(workspace)}`.

## Inputs

- `window.harnessCore.pickProjectParent()` / `pickProjectFolder()` — native
  directory pickers of the Electron host (`{canceled, path}`).
- `window.harnessCore.inspectProjectFolder({path})` — the Core inspect
  result (`state`, `action`, `nestedIn`).
- `window.harnessCore.prepareProject({mode, path, name?, install?})` — the
  Core preparation result or a Kit failure envelope.

## Outputs

- New Project: parent folder (picker) and project name (required, the new
  folder name); "Create Project" sends `mode: "new"`.
- Open Project: the folder (picker), then the Core inspection: the helper
  text of the state (`project.state.<STATE>`, or `project.state.nested`
  when `nestedIn` is set) and the primary button chosen from the Core
  `action` (`project-setup-actions.ts`): `install`/`install-migrate` —
  "Install Workflow Kit", `update` — "Update Workflow Kit", `open`/`doctor`
  — "Open Project", `create`/`unsupported` — none. "Open Without Kit"
  (`install: false`) is offered for `install`, `install-migrate`, `update`
  and `unsupported`. The project name is asked for a new project and before
  an installation.
- `onPrepared(workspace)` after Core prepared and selected the workspace.
- Failures show the Core message and next action in an in-app alert; a
  pending state blocks the controls. No native `alert`/`confirm`/`prompt`.
- Every string comes from the approved localization dictionaries
  (`project.setup.*`, `project.state.*`).

## Tests

- `src/project-setup-dialog.test.mjs` — the action-to-button mapping,
  "Open Without Kit" and project-name rules, and the bridge-only contract
  of the dialog.

## Owned Paths

- `module.md`
- `src/**`
