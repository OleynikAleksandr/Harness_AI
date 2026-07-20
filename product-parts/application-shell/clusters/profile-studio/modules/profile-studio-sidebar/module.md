# Profile Studio Sidebar Module

## Responsibility

Present the exact provider/model target hierarchy and compatible Studio v2
profile-session rows supplied by Core Runtime.

## Public Facade

`ProfileStudioSidebarFacade`

## Inputs

- Core `ProfileStudioTargetProvider` snapshots.
- Exact-target `ProfileStudioProfileRow` snapshots.
- Selected provider, model and profile ids plus pending state.

## Outputs

- Provider/model selection intents.
- Create Draft intent for the selected target.
- Profile selection carrying the bound persistent creator-session row.
- Return-to-workspaces intent.

Rows show only Studio-managed `Draft` or `Valid` profiles. Raw Native Capture
records and a virtual Native profile are not sidebar entries. Empty target and
profile states are explicit, and no renderer filesystem or Core bridge access
exists inside the facade.

## Owned Paths

- `module.md`
- `src/**`
