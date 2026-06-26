# Harness AI Agent Instructions

## Communication

- All chat communication with the user is in Russian.
- Keep updates direct and concrete.

## Development Mode

- Use the simplest working solution first.
- Do not add abstractions, factories, interfaces, configs, dependencies, or future extension points unless the active plan or current implementation needs them.
- CodeAI Hub is reference material only. Do not copy whole modules into Harness AI.

## Plan-First Lifecycle

- The recovery owner is `.harness/plans/todo-plan.md`.
- Before changing tracked files, check the active plan state with `npm run plan:status`.
- Every implementation task must have a paired `Git Commit: ...` line.
- Each microtask should touch no more than 3 functional files unless the plan splits it first.
- Use `npm run plan:commit -- "<expected commit message>"` for planned commits after the harness is installed.
- Do not bypass Git hooks.

## Product Tree Ownership

- Product Part / Cluster / Module structure is primary.
- Production code lives under `product-parts/**`.
- A module owns only its own `module.md` and `src/**`.
- External access to a module goes through that module's public facade.
- New feature or algorithm responsibility means a new module or a clearly scoped additive change to an existing module.

## Boundaries

- No module implementation file may exceed 500 lines.
- No native `window.alert`, `window.prompt`, or `window.confirm` in Electron UI flows.
- Markdown and source files must use UTF-8 and LF line endings.
- Any non-trivial module implementation leaves one runnable check.

## Runtime State

- `.harness/runtime/**` is ignored local runtime state.
- Provider secrets, homes, caches, logs, and process residue must not be tracked.
- Session history uses append-only JSONL under `.harness/sessions/**` when the session runtime is implemented.
