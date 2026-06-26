# Normalizer Provider Runner Module

## Responsibility

Call a chosen provider/model for intent normalization.

## Public Facade

`NormalizerProviderRunnerFacade`

## Inputs

- Raw user intent.
- Normalizer provider/model selection.
- Normalizer prompt contract.

## Outputs

- Candidate normalized envelope.
- Provider diagnostics.

## MVP Status

Scaffolded only. Not wired into the session turn path.

## Owned Paths

- `module.md`
- `src/**`
