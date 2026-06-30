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
- Codex reasoning summary/text deltas materialized as stable
  `dialog_message` events tagged `thinking`; summary block ids use
  `<itemId>::summary-block::<index>` and completed items do not duplicate blocks
  already streamed when later summary parts started.

## Owned Paths

- `module.md`
- `src/**`
