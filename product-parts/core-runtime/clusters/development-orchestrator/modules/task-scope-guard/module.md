# Task Scope Guard Module

## Responsibility

Check Product Part / Cluster / Module ownership and file-scope limits for active tasks.

## Public Facade

`TaskScopeGuardFacade`

## Inputs

- Active task scope.
- Changed file paths.
- Product tree snapshot.

## Outputs

- Scope validation result.
- Ownership diagnostics.

## Owned Paths

- `module.md`
- `src/**`
