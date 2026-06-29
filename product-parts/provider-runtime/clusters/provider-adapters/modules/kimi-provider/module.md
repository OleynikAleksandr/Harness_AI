# Kimi Provider Module

## Responsibility

Harness-packaged Kimi provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference Kimi ACP
implementation. The facade only binds Harness workspace paths, provider home
state, selected model and thinking default; lifecycle, managed agent profile,
wire process/router, event normalization and Kimi-specific usage readers come from the
migrated CodeAI-Hub module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/kimi/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/kimi/home`.
The facade accepts an explicit `providerHomePath` for Core-owned global-home
liveness preflight without treating that global home as a workspace root.

## Public Facade

`KimiProviderFacade`

## Inputs

- Provider turn request.
- Kimi auth/home configuration.
- Workspace path used as the CLI cwd so Kimi can read workspace-local instructions and project files.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Kimi 5h and weekly usage limit telemetry read from the native Kimi usage API via the same user config used by the reference Kimi runtime.
- Kimi ACP assistant/thinking events routed by the reference session event
  router.
- Managed Kimi agent profile materialized under Harness runtime provider home.
- `ensureWorkspaceHome(workspacePath)` creates the workspace Kimi provider
  home and materializes the managed agent profile without starting Kimi CLI.

## Owned Paths

- `module.md`
- `src/**`
