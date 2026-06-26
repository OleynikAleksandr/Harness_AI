# Development Orchestrator Cluster

## Boundary

Owns plan-first lifecycle, managed commits, task scope checks, and quality-gate execution.

## Owned Modules

- `plan-orchestrator`
- `git-transaction-manager`
- `task-scope-guard`
- `quality-gate-runner`

## Facade Rule

Workspace-changing actions enter through orchestrator facades so recovery state, commits, and gates stay Core-owned.
