# Client Contract Module

## Responsibility

Own the shared type contract of the universal client: the turn request that an
endpoint module hands to the core, the OpenAI-shape message and tool-call
model, the tool descriptor with a source abstraction, the per-provider dialect
capability profile the core degrades request parameters by, and the client
output-event / error model that the core emits (later mapped onto the Core
`NormalizedProviderEvent` contract). This module is types plus the small pure
tool-name namespacing helper; it holds no I/O and no loop logic — those live in
the sibling modules built on this contract.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.2, 3.3,
3.4, 3.9, 3.10).

## Public Facade

`client-contract-facade.ts`

## Inputs

- Endpoint modules construct a `ClientTurnRequest` (model, message history,
  available `ToolDescriptor`s, the provider `DialectProfile`, optional api key
  and abort signal).
- The tool registry and future extension sources construct `ToolDescriptor`s
  with a `ToolSource` (`builtin` now; `mcp` / `skill` reserved for future
  modules).

## Outputs

- `ClientMessage` / `ClientMessageRole` / `ClientToolCall`: the OpenAI-shape
  conversation model (system / user / assistant-with-tool-calls / tool result).
- `ToolSource` and `ToolDescriptor`: a tool is a name + description + JSON
  Schema parameters + source + `qualifiedName`. Only `builtin` executes in MVP;
  `mcp` / `skill` are reserved registration sources (future modules, doc 3.10).
- `DialectProfile` with `ThinkingForm` (`reasoning_content` / `reasoning` /
  `reasoning_details` / `think_tags` / `none`) and `ToolChoiceSupport`
  (`auto_only` / `full` / `unsupported`): the declarative per-provider
  capabilities the core degrades request parameters by.
- `ClientTurnRequest`: the full turn input for the core loop.
- `ClientTurnEvent` / `ClientTurnEventKind` and `ClientErrorReason`: the
  client's output-event and error taxonomy (`auth_failed` / `rate_limited` /
  `quota_exhausted` / `context_overflow` / `network` / `provider_error` /
  `aborted`). This is the mechanical output→event model, NOT any
  user-INPUT normalization (a separate future concept).
- `qualifyToolName(source, name, serverName?)`: namespaces a tool name by
  source (`mcp:<server>:<tool>`, `skill:<name>`, built-in bare name) so future
  MCP/skill tools never collide with built-ins.

## Owned Paths

- `module.md`
- `src/**`
