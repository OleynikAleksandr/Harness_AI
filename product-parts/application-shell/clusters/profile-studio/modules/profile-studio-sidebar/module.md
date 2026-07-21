# Profile Studio Sidebar Module

## Responsibility

Present the exact provider/model target hierarchy and compatible Studio v2
profile-session rows supplied by Core Runtime.

## Public Facade

`ProfileStudioSidebarFacade`

## Inputs

- Core `ProfileStudioTargetProvider` snapshots.
- Exact-target `ProfileStudioProfileRow` snapshots.
- Selected provider, model and profile ids plus create/delete pending state.

## Outputs

- Provider/model selection intents.
- Create Draft intent for the selected target.
- Profile selection carrying the bound persistent creator-session row.
- Delete intent only after an in-app confirmation dialog identifies both the
  profile and its bound Profile Creator Agent session; native browser dialogs
  are not used.
- Return-to-workspaces intent.

Rows show only Studio-managed `Draft` or `Valid` profiles. Raw Native Capture
records and a virtual Native profile are not sidebar entries. Empty target and
profile states are explicit, and no renderer filesystem or Core bridge access
exists inside the facade. A successful delete removes the row immediately;
failure keeps the dialog/profile intact and is rendered by the shell.

## Owned Paths

- `module.md`
- `src/**`
