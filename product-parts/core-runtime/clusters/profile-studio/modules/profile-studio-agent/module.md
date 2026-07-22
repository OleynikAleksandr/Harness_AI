# Profile Studio Agent Module

## Responsibility

Own the provider-neutral Profile Creator structured-output contract and the
settings-selected Creator Agent turn spec. The first execution identity is
always Codex / `gpt-5.6-sol` / `high`, independently of the target provider and
model being authored. Every creator session uses reserved workspace id
`profile-studio` and the HARNESS_AI_HOME-aware isolated
`ProfileStudio/workspace` path.

`buildTurnSpec()` accepts only the resolved execution identity and exact
effective system prompt loaded by `profile-studio-creator-profile`. It does not
append target/draft JSON, inline fallback instructions, AGENTS/Skills, project
settings, or managed tool substitutions. Dynamic target/Capture facts belong
to the separate first user message. `getOutputSchema()` exposes the stable
schema for create and resumed turns.

The Codex-compatible strict JSON Schema requires `assistantResponse`,
discussion-only or complete `draft`, and `continue | request-approval`. Drafts
require every profile field, a nullable donor artifact path and one uniform
`toolSelection` envelope. Because strict Codex Structured Outputs cannot use
the former `oneOf` provider variants or describe arbitrary provider tool
objects, the envelope carries `mode`, nullable/declarative `runtimeEffect` and
`toolsJson`. `parseTurnResult()` parses that JSON text back into the existing
provider-specific Core snapshot, rejects malformed/non-object inventories and
enforces a non-empty Codex inventory before controlled authoring. The stored
profile contract remains structured `tools.json`; renderer text is never
parsed for state.

Session Runtime consumes this facade through its explicit
`createProfileCreatorSession()` path. It resolves the Core setting and managed
agent catalog, loads the four user-space components, persists the composed
system prompt as a managed session-profile snapshot, restores the dedicated
Studio session index, and reapplies this facade's output schema plus the
persisted Codex model/reasoning on every dispatch after create or resume. Its result handler
validates normalized raw provider structured output here before publishing `assistantResponse` or
passing a complete draft to the authoring facade; free-form dialog text is
never an authoring input.

## Public Facade

`ProfileStudioAgentFacade`

## Inputs

- Settings-selected execution identity and the already validated/composed
  system prompt.
- Provider structured output returned for a creator turn when that adapter
  exposes the normalized `structured_output` event.

## Outputs

- Codex `ProfileStudioAgentTurnSpec` with model/reasoning/workspace, exact
  composite system prompt, empty settings/runtime-tool overrides and JSON
  Schema.
- Validated `ProfileCreatorTurnResult` or a controlled parse error.

## Owned Paths

- `module.md`
- `src/**`
