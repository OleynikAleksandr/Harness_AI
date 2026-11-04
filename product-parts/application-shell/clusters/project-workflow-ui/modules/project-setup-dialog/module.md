# Project Setup Dialog Module

## Responsibility

The New Project and Open Project dialog. It collects the user's folder
choice (and, for a new project, its name) and shows what Core reports; Core
inspects the folder, installs or updates the Workflow Kit and registers the
workspace. It also owns the git identity form that the dialog and Project
Doctor show when git has no real global identity.

## Public Facade

`ProjectSetupDialogFacade` (`src/project-setup-dialog-facade.tsx`), props
`{mode: "new" | "open", onClose, onPrepared(workspace)}`. The facade also
re-exports, for `project-doctor-panel`:
- `GitIdentityForm` (`src/git-identity-form.tsx`, styles in
  `src/git-identity-form.css`), props `{onSaved}`;
- `failureText(failure)` (`src/project-setup-actions.ts`).

## Inputs

- `window.harnessCore.pickProjectParent()` / `pickProjectFolder()` — native
  directory pickers of the Electron host (`{canceled, path}`).
- `window.harnessCore.inspectProjectFolder({path})` — the Core inspect
  result (`state`, `action`, `nestedIn`).
- `window.harnessCore.prepareProject({mode, path, name?, install?})` — the
  Core preparation result or a Kit failure envelope.
- `window.harnessCore.setGitIdentity({name, email})` — the Kit
  `identity:set --global` envelope through Core (`workflow-identity-set`).

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
  and `unsupported`. Only New Project shows the project name field
  (`asksProjectName(mode)`); Open Project never sends a name, and the Kit
  names the project after the folder.
- `onPrepared(workspace)` after Core prepared and selected the workspace.
- When the preparation fails with `GIT_IDENTITY_REQUIRED`
  (`needsGitIdentity`), the dialog shows the git identity form instead of
  the error: the one-line explanation "Git signs every commit. Enter your
  name and email once for all projects on this computer.", the fields Name
  and Email and the button "Save and continue". The form sends the typed
  values unchanged to `setGitIdentity`; the Kit validates them, and a
  refusal (`GIT_IDENTITY_INVALID`, `GIT_IDENTITY_PLACEHOLDER`) shows only
  its message under the fields. After a success the dialog repeats the same
  `prepareProject` request (same folder, name and `install` flag)
  automatically.
- Other failures show the Core message in an in-app alert, with the next
  action on its own line unless the message already contains it
  (`failureText`); a pending state blocks the controls. No native
  `alert`/`confirm`/`prompt`.
- Every string comes from the approved localization dictionaries
  (`project.setup.*`, `project.state.*`, `project.identity.*`).

## Tests

- `src/project-setup-dialog.test.mjs` — the action-to-button mapping,
  "Open Without Kit", the name field only in New Project, `failureText`
  without repetition, the identity form route (`GIT_IDENTITY_REQUIRED`,
  `setGitIdentity`, message-only refusal, automatic retry, facade export,
  localized strings) and the bridge-only contract of the dialog.

## Owned Paths

- `module.md`
- `src/**`
