# Core Runtime Process Module

## Responsibility

Runs the Core Runtime as an out-of-process local server.

This module owns the process entrypoint and the minimal process contracts used
by the Application Shell supervisor/client: health, status and shutdown. Session,
provider and settings APIs are added behind this process boundary in later
tasks.

## Public Facade

`CoreRuntimeProcessFacade`

## Inputs

- Core process host and port options.
- Shutdown request from the local supervisor/client.

## Outputs

- Local HTTP process contract.
- Health/status payload with process identity.
- Graceful shutdown acknowledgement.

## Owned Paths

- `module.md`
- `src/**`
