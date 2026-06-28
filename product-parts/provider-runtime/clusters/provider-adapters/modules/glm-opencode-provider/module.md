# GLM OpenCode Provider Module

## Responsibility

Harness-packaged GLM OpenCode provider migrated from CodeAI-Hub.

The module owns the Harness facade and the embedded reference OpenCode runtime.
The facade only binds Harness workspace paths, settings path, selected model and
provider home path; OpenCode server/session behavior, output normalization,
SSE processing and runtime profile resolution come from the migrated CodeAI-Hub
module.

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

## Owned Paths

- `module.md`
- `src/**`
