# Core Process Bridge Module

## Responsibility

Start, stop, restart, health-check, or connect to the local Core Runtime
process used by the Electron host.

This module is Application Shell infrastructure only. It supervises the Core
process, forwards renderer IPC as Core RPC, and relays Core event-stream
messages to renderer windows. It must not import Core/provider implementation
modules or own Core truth.

## Public Facade

`CoreProcessBridgeFacade`

## Inputs

- Workspace/app startup context.
- Core process command or connection settings.
- Renderer session hydration requests.
- Core restart/stop requests from settings UI.

## Outputs

- Core Runtime connection status.
- Renderer-safe Core API endpoint metadata.
- Renderer-safe forwarding of Core RPC results and Core events.
- Real Core process restart through health and shutdown contracts.

## Owned Paths

- `module.md`
- `src/**`
