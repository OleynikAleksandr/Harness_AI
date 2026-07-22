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

The shell loads typed target/profile/inspector snapshots, forwards Create,
Delete and exact-hash Approve commands, and subscribes to the isolated
`profile-studio:updated` stream. It never scans profile files, compiles prompts,
validates provider capability or interprets creator structured output.

While one Create RPC is pending, the shell exposes that single Core operation
as preparation state and freezes target switching. A structured preflight or
Capture failure remains attached to the Create control and does not invent a
Draft/session. Once Core returns success, the existing atomic row/session/
inspector convergence runs unchanged; later provider-turn failures belong to
the standard session surface.

Profile selection activates the row's persistent creator session through the
ordinary session controller. The shell displays that session only after the
selected row and active session binding agree, preventing transcript content
from another profile appearing below a newly selected header.

A successful Create response is applied as one UI transition: the returned
Draft row is inserted and selected immediately, the returned persisted creator
session is added/activated, and the inspector loads for the same profile id.
Refreshing the compatible profile list may reconcile that row but must not
clear an inspector snapshot when the selected id did not change. Provider
binding failure is rendered inside the standard session surface; it does not
remove the session or inspector.

A successful Delete response removes the exact row immediately and selects
the next compatible profile/session, or clears both center and inspector when
none remain. The shell submits only the profile id; Core owns v2 validation,
document removal and bound creator-session cleanup.

## Application Mode

The ordinary Session Window owns entry and return:

- `Profile Studio` beside Settings enters this mode;
- before Studio is mounted, its session controller is replaced with the full
  persisted list from the dedicated `profile-studio` workspace rather than
  mixing that list with ordinary workspace sessions;
- the application-mode event authority changes to Studio before that async
  restore begins, and stale list responses from the previous ordinary
  workspace are rejected by the shared session controller;
- the newest restored creator session seeds the exact provider, model and
  profile row, so its transcript remains selected after return and re-entry;
- return reloads the previously selected user workspace/session list;
- detached-session windows do not render the ordinary sidebar and therefore
  cannot enter Studio mode.

## Owned Paths

- `module.md`
- `src/**`
