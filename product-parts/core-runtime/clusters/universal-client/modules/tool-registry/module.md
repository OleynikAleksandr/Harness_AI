# Tool Registry Module

## Responsibility

Own the universal client's tool registry with a source abstraction. Tools come
from sources — the built-in tools module now; MCP and skills are reserved
registration points, NOT MVP. The registry aggregates the descriptors sources
expose for a turn request and routes a tool call to the source that owns it.
Permissions are pass-through in MVP (full-auto, no ruleset) — `listDescriptors`
returns every registered descriptor; a future permission ruleset would filter
here without changing the agent loop.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.2, 3.5,
3.10).

## Public Facade

`tool-registry-facade.ts`

## Inputs

- `ToolSourceProvider`s registered via `registerSource` (each exposes its
  `source`, a `list()` of `ToolDescriptor`s, and an `execute` for its own
  calls). The built-in tools module implements one; future MCP/skill modules
  register more.
- A tool call (`qualifiedName`, `argumentsJson`) and a `ToolExecutionContext`
  (workspace path + optional abort signal) from the agent loop.

## Outputs

- `createToolRegistry()` -> `ToolRegistry` with:
  - `registerSource(provider)`: adds a source and indexes its descriptors by
    `qualifiedName` for routing.
  - `listDescriptors()`: every registered descriptor (the pass-through
    permission boundary in MVP).
  - `execute(qualifiedName, argumentsJson, context)`: routes to the owning
    source; an unknown tool returns an error `ToolExecutionResult` (never
    throws) so a bad tool call is reported to the model, not fatal.
- `ToolSourceProvider` / `ToolExecutionContext` / `ToolExecutionResult`: the
  source and execution contract the built-in tools (and future sources) build on.

## Owned Paths

- `module.md`
- `src/**`
