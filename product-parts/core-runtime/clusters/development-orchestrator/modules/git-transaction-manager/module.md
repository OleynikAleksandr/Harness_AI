# Git Transaction Manager Module

## Responsibility

Own git init, automatic commits, clean-tree checks, and commit lifecycle boundaries.

## Public Facade

`GitTransactionManagerFacade`

## Inputs

- Expected commit message.
- Scoped file changes.
- Gate result.

## Outputs

- Commit result.
- Dirty tree and debt diagnostics.

## Owned Paths

- `module.md`
- `src/**`
