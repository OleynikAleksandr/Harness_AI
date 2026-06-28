# Kimi Provider Module

## Responsibility

Fresh Harness AI adapter for Kimi provider turns.

## Public Facade

`KimiProviderFacade`

## Inputs

- Provider turn request.
- Kimi auth/home configuration.
- Workspace path used as the CLI cwd so Kimi can read workspace-local instructions and project files.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Kimi `stream-json` assistant/thinking chunks routed through the shared provider adapter contract.

## Owned Paths

- `module.md`
- `src/**`
