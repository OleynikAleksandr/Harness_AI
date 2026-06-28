# Application Shell

## Purpose

Standalone Electron interface surface around Harness AI.

Application Shell is UI plus Core supervisor/client only. It does not own
backend truth and must not compose Core Runtime or Provider Runtime
implementation modules in-process.

## Owned Clusters

- `electron-host`
- `session-interface`
- `settings-surface`

## Responsibilities

- Own the desktop application window and renderer surface.
- Present classic chat sessions, workspace selection, session lists, and settings from Core read models.
- Forward user input and settings changes to Core contracts.
- Start, stop, restart, health-check, or connect to the Core process.
- Open workspace file links in Visual Studio Code.

## Out Of Scope

- Provider execution truth.
- Provider adapter instantiation or registration.
- Core Runtime module composition.
- Session history persistence truth.
- Settings truth.
- Plan orchestration truth.
