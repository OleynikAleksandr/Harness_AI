# Kimi Provider Module

## Responsibility

Harness-packaged Kimi provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference Kimi ACP
implementation. The facade only binds Harness workspace paths, provider home
state, selected model and thinking default; lifecycle, managed agent profile,
wire process/router, event normalization and usage readers come from the
migrated CodeAI-Hub module.

## Public Facade

`KimiProviderFacade`

## Inputs

- Provider turn request.
- Kimi auth/home configuration.
- Workspace path used as the CLI cwd so Kimi can read workspace-local instructions and project files.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Kimi ACP assistant/thinking events routed by the reference session event
  router.
- Managed Kimi agent profile materialized under Harness runtime provider home.

## Owned Paths

- `module.md`
- `src/**`
