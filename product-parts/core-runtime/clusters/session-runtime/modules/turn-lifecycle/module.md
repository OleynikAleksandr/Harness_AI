# Turn Lifecycle Module

## Responsibility

Own running/idle/failure state and Stop/Continue boundaries for a session turn.

## Public Facade

`TurnLifecycleFacade`

## Inputs

- User turn request.
- Provider execution state.
- Stop/continue intents.

## Outputs

- Turn lifecycle snapshot.
- Provider dispatch/cancel signals.

## Owned Paths

- `module.md`
- `src/**`
