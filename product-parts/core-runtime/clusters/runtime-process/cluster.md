# Runtime Process Cluster

## Boundary

Owns the out-of-process Core Runtime server lifecycle and process contracts.
This cluster is the only Core process entrypoint used by Application Shell.

## Owned Modules

- `core-runtime-process`

## Facade Rule

Application Shell talks to Core through process contracts exposed by this
cluster. It must not import Core implementation modules directly.

## Contracts

- `GET /api/v1/health` and `GET /api/v1/status` report process readiness.
- `POST /api/v1/shutdown` stops Core through the supervisor contract.
- `POST /api/v1/rpc` executes Core-owned workspace, session, settings,
  provider, local-model, provider-version and Profile Studio actions.
- `GET /api/v1/events` streams Core session events and isolated Profile Studio
  update notifications to Application Shell.

## Ownership

- Core process composes provider adapters and owns provider registration.
- Application Shell supervises, forwards user/UI requests and displays Core
  read models only.
