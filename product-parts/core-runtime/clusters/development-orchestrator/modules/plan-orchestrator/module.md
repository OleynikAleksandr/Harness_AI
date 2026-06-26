# Plan Orchestrator Module

## Responsibility

Own the plan-first lifecycle and recovery state for workspace-changing work.

## Public Facade

`PlanOrchestratorFacade`

## Inputs

- User/developer work intent.
- Active plan file.
- Commit outcomes.

## Outputs

- Current task and expected commit state.
- Recovery and blocker diagnostics.

## Owned Paths

- `module.md`
- `src/**`
