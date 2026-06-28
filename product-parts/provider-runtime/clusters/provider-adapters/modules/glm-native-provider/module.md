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

## Owned Paths

- `module.md`
- `src/**`
