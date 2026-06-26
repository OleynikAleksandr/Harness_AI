# Core Process Bridge Module

## Responsibility

Start or connect to the local Core Runtime process used by the Electron host.

## Public Facade

`CoreProcessBridgeFacade`

## Inputs

- Workspace/app startup context.
- Core process command or connection settings.

## Outputs

- Core Runtime connection status.
- Renderer-safe Core API endpoint metadata.

## Owned Paths

- `module.md`
- `src/**`
