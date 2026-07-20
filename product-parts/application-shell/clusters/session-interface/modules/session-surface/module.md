# Session Surface Module

## Responsibility

Own the reusable central session composition shared by the ordinary workspace
window and Profile Studio: SessionId/limits, optional subagent parent header,
the real dialog timeline, composer/Stop/turn timing, and the provider status
panel. It receives Core/session state and callbacks; it does not subscribe to
events, select workspaces, choose profiles or own shell/sidebar state.

The facade preserves the existing Session Window component instances and CSS
class names. It is an extraction boundary, not a second renderer or a visual
reinterpretation of the accepted session interface.

## Public Facade

`SessionSurfaceFacade`

## Inputs

- Active Core session, messages, subagent calls, telemetry and settings.
- Workspace root and Core-derived turn timing/running state.
- Submit, Stop, rollback and session-navigation callbacks owned by the host.

## Outputs

- The standard central session surface, or the established empty workspace
  element when no session is selected.

## Owned Paths

- `module.md`
- `src/**`
