# GLM OpenCode Provider Module

## Responsibility

Harness-packaged GLM OpenCode provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference OpenCode runtime.
The facade only binds Harness workspace paths, settings path, selected model and
provider home path; OpenCode server/session behavior, output normalization,
SSE processing and runtime profile resolution come from the migrated CodeAI-Hub
module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/glm-opencode/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/glm-opencode/home`.
The facade accepts an explicit `providerHomePath` for Core-owned global-home
liveness preflight without treating that global home as a workspace root.

## Public Facade

`GlmOpenCodeProviderFacade`

## Inputs

- Provider turn request.
- GLM OpenCode auth/home configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- OpenCode assistant/thinking stream events normalized by the reference output
  normalizer.
- `ensureWorkspaceHome(workspacePath)` materializes the isolated OpenCode
  runtime home/config/data directories and auth file for the workspace without
  starting OpenCode.

## Owned Paths

- `module.md`
- `src/**`
