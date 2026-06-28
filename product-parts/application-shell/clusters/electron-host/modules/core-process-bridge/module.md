# Core Process Bridge Module

## Responsibility

Start, stop, restart, health-check, or connect to the local Core Runtime
process used by the Electron host.

This module is Application Shell infrastructure only. It supervises the Core
process and forwards UI calls; it must not own Core truth.

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
- Best-effort Core usage-limit refresh trigger for hydrated sessions; provider limit truth stays in Core/provider modules.
- Real Core process restart through health and shutdown contracts.

## Owned Paths

- `module.md`
- `src/**`
