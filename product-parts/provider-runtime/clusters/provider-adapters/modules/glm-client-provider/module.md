# GLM Client Provider Module

## Responsibility

The thin GLM endpoint for the Core universal client. Holds GLM/Z.ai coding
endpoint specifics — `api.z.ai/api/coding/paas/v4`, `Accept-Language:
en-US,en`, `reasoning_content`, auto-only tool choice, final-chunk usage, the
Core-owned GLM client model catalog — builds the `ClientTurnRequest` with GLM
extra body parameters, and exposes the `ProviderAdapter` that Core session
routing constructs.

This module is provider-specific glue only. It does not own the agent loop,
tool execution, SSE parsing, event normalization, or built-in tool source;
those live in the Core `universal-client` cluster. The adapter wires the Core
loop, the built-in tools, the GLM dialect, and the GLM client settings together
per session.

Contract source: `docs/architecture/UniversalClient.md` (sections 3.3, 3.7),
and Phase 3 in `.harness/plans/todo-plan.md`.

## Public Facade

`glm-client-provider-facade.ts`

## Inputs

- `GlmTurnInput`: the Z.ai Coding Plan API key, message history, available tool
  descriptors, selected model, reasoning effort, and optional abort signal.
- `ProviderAdapter` calls from Core session routing.
- Core settings truth: `providers.glmClient.defaultModel` and
  `providers.glmClient.reasoningEffort`.

## Outputs

- `GLM_DIALECT`: the GLM `DialectProfile` (base URL, `Accept-Language`,
  `reasoning_content`, auto-only tool choice, final-chunk usage).
- `GLM_DEFAULT_MODEL`: `glm-5.2`.
- `buildGlmTurnRequest(input)`: the Core `ClientTurnRequest` for a GLM turn,
  including `extraBody` (`thinking: {type: "enabled"}`,
  `reasoning_effort`, `tool_stream: true`).
- `GlmClientProviderFacade`: the `ProviderAdapter` on the universal client.
  Sessions are in-memory: each keeps message history and carries the final
  in-turn history returned by `runClientTurn` into the next turn. Turn events
  map through `mapClientTurnEvent` onto `NormalizedProviderEvent`s; a failed
  turn also emits `stream_error`. A missing key fails with an English adapter
  literal, while localized provider help belongs to Settings UI. Stop aborts
  the in-flight turn but keeps history; `deleteSessionArtifacts` drops the
  in-memory state. Session history does not persist across a Core restart
  (client MVP).

- Workflow Kit context: `createSession`/`resumeSession` accept
  `ProviderSessionStartOptions`; when a new in-memory history starts and
  Core passed `workspaceContext`, the history opens with it as a system
  message (`workspaceContextSystemMessages` from the adapter contract), so
  every turn carries it. A history that already exists in memory keeps its
  first context; the autopilot turn text carries the fresh packet.

## Owned Paths

- `module.md`
- `src/**`
