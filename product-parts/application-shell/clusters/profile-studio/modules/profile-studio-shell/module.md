# Profile Studio Shell Module

## Responsibility

Own the single-window Profile Studio presentation mode and its Core bridge
coordination without owning profile or session truth.

## Public Facade

`ProfileStudioShellFacade`

## Composition

- `ProfileStudioSidebarFacade` on the left.
- The existing `SessionSurfaceFacade` in the center.
- `ProfileStudioInspectorFacade` on the right.

The shell loads typed target/profile/inspector snapshots, forwards Create and
exact-hash Approve commands, and subscribes to the isolated
`profile-studio:updated` stream. It never scans profile files, compiles prompts,
validates provider capability or interprets creator structured output.

Profile selection activates the row's persistent creator session through the
ordinary session controller. The shell displays that session only after the
selected row and active session binding agree, preventing transcript content
from another profile appearing below a newly selected header.

## Application Mode

The ordinary Session Window owns entry and return:

- `Profile Studio` beside Settings enters this mode;
- restored creator sessions come from the dedicated `profile-studio`
  workspace;
- return reloads the previously selected user workspace/session list;
- detached-session windows do not render the ordinary sidebar and therefore
  cannot enter Studio mode.

## Owned Paths

- `module.md`
- `src/**`
