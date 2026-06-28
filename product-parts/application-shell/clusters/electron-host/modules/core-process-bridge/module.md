# Core Process Bridge Module

## Responsibility

Start or connect to the local Core Runtime process used by the Electron host.

## Public Facade

`CoreProcessBridgeFacade`

## Inputs

- Workspace/app startup context.
- Core process command or connection settings.
- Renderer session hydration requests.

## Outputs

- Core Runtime connection status.
- Renderer-safe Core API endpoint metadata.
- Best-effort Core usage-limit refresh trigger for hydrated sessions; provider limit truth stays in Core/provider modules.

## Owned Paths

- `module.md`
- `src/**`
