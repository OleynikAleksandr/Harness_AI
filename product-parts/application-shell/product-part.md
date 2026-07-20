# Application Shell

## Purpose

Standalone Electron interface surface around Harness AI.

Application Shell is UI plus Core supervisor/client only. It does not own
backend truth and must not compose Core Runtime or Provider Runtime
implementation modules in-process.

## Owned Clusters

- `electron-host`
- `browser-localization`
- `session-interface`
- `settings-surface`

## Responsibilities

- Own the desktop application window and renderer surface.
- Present classic chat sessions, workspace selection, session lists, and settings from Core read models.
- Reuse one `SessionSurfaceFacade` for the ordinary window and Profile Studio
  central column without duplicating dialog/input/telemetry rendering.
- Present Core-owned recursive subagent session trees and submit open, detach,
  rename and regenerate-title intents without deriving orchestration state.
- Resolve browser display copy through Core-provided localization payloads.
- Render Core-provided `localizedContent` patches for translated reasoning
  without rewriting Core source message text.
- Forward user input and settings changes to Core contracts.
- Forward Profile Studio commands and its isolated update stream without
  composing lifecycle/read-model truth in Electron or renderer code.
- Start, stop, restart, health-check, or connect to the Core process.
- Open workspace file links in Visual Studio Code.

## Out Of Scope

- Provider execution truth.
- Provider adapter instantiation or registration.
- Core Runtime module composition.
- Session history persistence truth.
- Translation overlay truth.
- Settings truth.
- Plan orchestration truth.
