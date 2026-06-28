# Session Reasoning Display Module

## Responsibility

Project provider-visible reasoning/thinking payloads into Core dialog messages.

## Public Facade

`SessionReasoningDisplayFacade`

## Inputs

- Provider events already routed through Core.
- Provider text that may include visible reasoning tags.

## Outputs

- Core-ready assistant and thinking display messages.
- Provider `tag` markers, including `live` and `thinking`, preserved for downstream Core/UI read-model handling.

## Owned Paths

- `module.md`
- `src/**`
