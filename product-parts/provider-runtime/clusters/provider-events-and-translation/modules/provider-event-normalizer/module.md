# Provider Event Normalizer Module

## Responsibility

Normalize provider stream/event payloads for Core Runtime.

## Public Facade

`ProviderEventNormalizerFacade`

## Inputs

- Provider-native stream/event payload.
- Provider descriptor.

## Outputs

- Provider-neutral event record.
- Event normalization diagnostics.
- Codex reasoning summary/text deltas materialized as `dialog_message` events tagged `thinking`.

## Owned Paths

- `module.md`
- `src/**`
