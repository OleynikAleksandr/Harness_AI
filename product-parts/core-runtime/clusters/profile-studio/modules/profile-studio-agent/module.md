# Profile Studio Agent Module

## Responsibility

Own the fixed Profile Creator Agent contract. Every creator turn uses Claude,
model `opus`, reasoning `high`, reserved workspace id `profile-studio` and the
HARNESS_AI_HOME-aware isolated `ProfileStudio/workspace` path. SDK settings
sources and tools are both empty arrays, so workspace CLAUDE/AGENTS/Skills,
project settings, filesystem, shell and web tools cannot become hidden inputs.

`buildTurnSpec()` constructs the complete authoring instruction and embeds the
exact target, current full draft and validated donor content inline. The agent
is told to begin by reducing the donor Native system prompt, then add concise
task-specific instructions, preserve exactly two source parts, return a full
snapshot rather than a patch and never assign Valid.

The JSON Schema requires `assistantResponse`, discussion-only or complete
`draft`, and `continue | request-approval`. Drafts require every profile field,
one of the three honest provider tool modes and nullable donor artifact path.
`parseTurnResult()` repeats shape validation before Core can forward the
snapshot to controlled authoring; renderer text is never parsed for state.

Session Runtime consumes this facade through its explicit
`createProfileCreatorSession()` path. It persists `systemPrompt` as a managed
session-profile snapshot, restores the dedicated Studio session index, and
reapplies this facade's fixed output schema and Claude model/reasoning options
on every dispatch after create or resume. Its result handler validates raw
provider structured output here before publishing `assistantResponse` or
passing a complete draft to the authoring facade; free-form dialog text is
never an authoring input.

## Public Facade

`ProfileStudioAgentFacade`

## Inputs

- `ProfileStudioAgentContext`: immutable profile id, exact provider/model,
  current full draft and optional validated donor content.
- Claude structured output returned for a creator turn.

## Outputs

- Fixed `ProfileStudioAgentTurnSpec` with provider/model/reasoning/workspace,
  inline system prompt, empty settings/tools and JSON Schema.
- Validated `ProfileCreatorTurnResult` or a controlled parse error.

## Owned Paths

- `module.md`
- `src/**`
