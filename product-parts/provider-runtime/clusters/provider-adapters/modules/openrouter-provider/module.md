# OpenRouter Provider Module

## Responsibility

Harness-packaged OpenRouter provider migrated from CodeAI-Hub.

The module owns the Harness facade and embedded reference OpenRouter chat
completion runtime. The facade binds Harness auth/model/endpoint settings;
session history, tool loop, request body construction, SSE reading and
reasoning/assistant stream events come from the migrated CodeAI-Hub module.

## Public Facade

`OpenRouterProviderFacade`

## Inputs

- Provider turn request.
- OpenRouter auth/model configuration.

## Outputs

- Normalized provider events.
- Provider usage/context telemetry.
- OpenRouter assistant and thinking stream events from the reference SSE reader.

## Owned Paths

- `module.md`
- `src/**`
