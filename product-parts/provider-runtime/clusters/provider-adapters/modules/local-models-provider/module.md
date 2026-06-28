# Local Models Provider Module

## Responsibility

Harness-packaged Local Models provider migrated from CodeAI-Hub.

The module owns the Harness facade and embedded reference LM Studio runtime.
The facade binds the selected local model; LM Studio discovery, model loading,
workflow tools, prompt controls and native streaming come from the migrated
CodeAI-Hub module.

## Public Facade

`LocalModelsProviderFacade`

## Inputs

- Provider turn request.
- Local model runtime configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- Local assistant and thinking stream events from the reference LM Studio SSE
  reader.

## Owned Paths

- `module.md`
- `src/**`
