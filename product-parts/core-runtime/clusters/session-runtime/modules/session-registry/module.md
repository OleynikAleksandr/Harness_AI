# Session Registry Module

## Responsibility

Own the session metadata read model that the session snapshot projector
reads. There is no built-in (bootstrap) session: the registry starts and
stays empty. Core sessions (create/open/rename, history) are owned by the
session request handler.

## Public Facade

`SessionRegistryFacade`

## Inputs

- Workspace id of the requested session list.

## Outputs

- `getSessions(workspaceId)` → `[]` for every workspace.
- `getActiveSessionId()` → `""` (no active session).

## Tests

- `src/session-registry-facade.test.mjs` — no bootstrap session, no active
  session.

## Owned Paths

- `module.md`
- `src/**`
