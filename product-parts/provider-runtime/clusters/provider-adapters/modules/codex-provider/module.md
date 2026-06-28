# Codex Provider Module

## Responsibility

Harness-packaged Codex AppServer provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference app-server
implementation. The facade only binds Harness workspace paths, provider home
state and settings path; provider workflow, app-server process management,
reasoning summary routing and provider-home config materialization come from
the migrated CodeAI-Hub module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/codex/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/codex/home`.
The workspace-scoped `CODEX_HOME`, `CODEX_WORKSPACE_PATH` and
`CODEX_SETTINGS_PATH` values are passed into the app-server process options, so
provider-home preparation uses the active workspace environment rather than
global process state.
Normal Harness sessions start Codex through the native/default app-server
profile so Codex keeps its own system instructions, native tooling, and
workspace `AGENTS.md` project-instruction discovery from `cwd`.

## Public Facade

`CodexProviderFacade`

## Inputs

- Provider turn request.
- Codex auth/home configuration.
- Active workspace path used as app-server `cwd`.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Codex usage-limit telemetry built inside the Codex provider module from
  app-server rate-limit snapshots/events.
- Turn-level Codex reasoning summaries emitted by the reference app-server
  event router.
- Provider-home `config.toml` materialized by the reference provider-home
  process code under Harness runtime paths.
- Native Codex `thread/start` without workflow `baseInstructions` or
  `project_doc_max_bytes: 0` override for ordinary workspace sessions.
- `deleteSessionArtifacts(providerSessionId, workspacePath)` removes the Codex
  rollout log(s) for a removed session from the workspace provider home, leaving
  the shared provider home otherwise intact.

## Owned Paths

- `module.md`
- `src/**`
