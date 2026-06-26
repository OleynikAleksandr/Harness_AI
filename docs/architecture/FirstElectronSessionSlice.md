# First Electron Session Slice

## Goal

Create the smallest runnable Harness AI desktop slice: an Electron app that opens directly into a classic chat session surface with a workspace/session sidebar, transcript, telemetry strip, and input controls.

## MVP Surface

- Left sidebar with workspace selector row, session list, rename affordance placeholder, and Settings entry.
- Main session window with transcript/dialog messages.
- Telemetry strip showing provider/model status, context window, and limits placeholders.
- Input controls with text entry, Stop, and Play.
- File links use the Electron host link opener and target Visual Studio Code.

## First-Slice Data Model

The first slice uses a Core-owned static session snapshot. It is intentionally not a provider implementation yet.

- Workspace id/name/path.
- Sessions list with one active session.
- Transcript messages.
- Provider/model/status telemetry placeholders.
- Turn lifecycle state for idle/running display.

## Implementation Route

1. Add Electron/React/Vite toolchain at the root.
2. Implement Core Runtime seed facades for workspace/session snapshots.
3. Implement Session Interface renderer modules.
4. Wire Electron main/preload startup and VS Code file-link opening.
5. Run local checks/build and record evidence.

## Constraints

- No Product Tree UI in this slice.
- No provider adapter turn execution in this slice.
- No terminal log panel in this slice.
- No normalizer wiring in this slice.
- No copied CodeAI Hub modules.
