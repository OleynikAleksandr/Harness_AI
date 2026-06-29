# GLM Native Provider Module

## Responsibility

Harness-packaged GLM Native provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference GLM native
runtime. The facade only binds Harness auth/settings, selected model, workspace
path and provider home path; request building, thinking controls, SSE parsing,
tool execution, session logging and GLM-specific usage limits come from the migrated
CodeAI-Hub module.
Provider home storage is Harness-owned: workspace sessions use
`<workspace>/.harness/runtime/providers/glm-native/home`, and non-workspace
fallbacks use `~/.harness-ai/providers/glm-native/home`.
The facade accepts an explicit `providerHomePath` for Core-owned global-home
liveness preflight without treating that global home as a workspace root.

## Public Facade

`GlmNativeProviderFacade`

## Inputs

- Provider turn request.
- GLM native auth/home configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- GLM Native thinking and assistant stream events from the reference SSE parser.
- Runtime tool execution and session logs under Harness runtime provider home.
- `ensureWorkspaceHome(workspacePath)` creates the workspace GLM Native
  provider home without starting the runtime; auth remains owned by the
  provider auth store/settings boundary.
- `deleteSessionArtifacts(providerSessionId, workspacePath)` removes the GLM rollout
  log (`home/sessions/**/<providerSessionId>.jsonl`) for a removed session, leaving
  the shared provider home intact.

## Owned Paths

- `module.md`
- `src/**`
