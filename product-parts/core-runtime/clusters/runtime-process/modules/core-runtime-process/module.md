# Core Runtime Process Module

## Responsibility

Runs the Core Runtime as an out-of-process local server.

This module owns the process entrypoint and process contracts used by the
Application Shell supervisor/client: health, status, shutdown, Core RPC, and
Core event streaming. Session, provider and settings truth stays inside this
Core process boundary.

## Public Facade

`CoreRuntimeProcessFacade`

## Inputs

- Core process host and port options.
- Shutdown request from the local supervisor/client.
- Core RPC envelope from the Application Shell client.

## Outputs

- Local HTTP process contract.
- Health/status payload with process identity.
- Graceful shutdown acknowledgement.
- Server-sent Core events and RPC results.

## Owned Paths

- `module.md`
- `src/**`
