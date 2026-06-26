# Application Shell

## Purpose

Standalone Electron application surface around the Harness AI session UI.

## Owned Clusters

- `electron-host`
- `session-interface`
- `settings-surface`

## Responsibilities

- Own the desktop application window and renderer surface.
- Present classic chat sessions, workspace selection, session lists, and settings.
- Open workspace file links in Visual Studio Code.

## Out Of Scope

- Provider execution truth.
- Session history persistence truth.
- Plan orchestration truth.
