# Codex Provider Module

## Responsibility

Harness-packaged Codex AppServer provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference app-server
implementation. The facade only binds Harness workspace paths, provider home
state and settings path; provider workflow, app-server process management,
reasoning summary routing and provider-home config materialization come from
the migrated CodeAI-Hub module.

## Public Facade

`CodexProviderFacade`

## Inputs

- Provider turn request.
- Codex auth/home configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Turn-level Codex reasoning summaries emitted by the reference app-server
  event router.
- Provider-home `config.toml` materialized by the reference provider-home
  process code under Harness runtime paths.

## Owned Paths

- `module.md`
- `src/**`
