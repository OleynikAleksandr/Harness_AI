# Execution Envelope Validator Module

## Responsibility

Validate normalized output before executor dispatch.

## Public Facade

`ExecutionEnvelopeValidatorFacade`

## Inputs

- Candidate normalized envelope.
- Intent envelope contract.

## Outputs

- Validated execution envelope.
- Reject/repair diagnostics.

## MVP Status

Scaffolded only. Not wired into the session turn path.

## Owned Paths

- `module.md`
- `src/**`
