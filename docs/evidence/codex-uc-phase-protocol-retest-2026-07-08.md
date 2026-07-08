# CodexUC Phase Protocol Retest - 2026-07-08

## Scope

Recorded the packaged-app retest after
`2a0309d5 fix(codex-uc): require explicit final phase`.

The user started a fresh CodexUC benchmark session in
`/Users/oleksandroliinyk/VSCODE/Test_CodexUC` with the
`codex-uc-benchmark` managed profile. The task was the Incident Triage Board
benchmark: planning document, todo-plan, implementation, build, evidence, and
manual/smoke verification.

## Observed Session

- Harness session:
  `/Users/oleksandroliinyk/VSCODE/Test_CodexUC/.harness/sessions/events/session-codex-uc-83988bf4-9f19-4594-9b4e-db8e95dd79d0.jsonl`
- Provider session: `codex-uc-389d7ff1-cb12-4b49-9781-838d5a1eec59`
- Profile: `codex-uc-benchmark`
- Route: `codex-oauth-responses`

## Phase Behavior

The normalized session events showed the expected phase mapping:

- intermediate assistant status/progress messages were persisted as
  `role: "assistant"` with `tag: "commentary"`;
- reasoning messages were persisted as `role: "thinking"` with
  `tag: "thinking"`;
- the terminal assistant answer was persisted as `role: "assistant"` with no
  `commentary` tag;
- after the terminal answer, telemetry switched to `status: "idle"` and the
  session emitted `turn-state idle`.

The session did not stop after progress text. CodexUC continued across many
tool-loop iterations: it created and debugged a CDP smoke runner, detected a
real `favicon.ico` console error, fixed the app source, rebuilt `dist`, reran
the full smoke test, updated evidence/todo artifacts, and only then emitted the
terminal answer.

## Provider Feedback

`~/.harness-ai/logs/providers/codex-uc-response-feedback.jsonl` for
`codex-uc-389d7ff1-cb12-4b49-9781-838d5a1eec59` confirmed that fresh requests
included the adapter-owned protocol tool:

- final backend feedback timestamp: `2026-07-08T11:13:10.451Z`;
- `toolsCount: 18`;
- `toolNames` included `final_answer`;
- final session telemetry: `used: 40,619`, `cached: 39,808`.

This is roughly in the same token/cache range as the comparable Codex
app-server benchmark run, which supports the conclusion that the custom
CodexUC route can be made behaviorally comparable when the provider adapter
owns prompt/tool surface plus phase/turn-completion semantics.

## Finding

The phase fix is a provider-adapter responsibility, not a generic client
feature and not a profile sidecar. Core/universal client code should not infer
finality from assistant text. Each direct/custom provider adapter must map its
wire protocol to Core phase events:

- progress text -> `commentary`;
- reasoning -> `thinking`;
- explicit completion signal -> terminal assistant answer.

If the upstream provider does not expose an equivalent of Codex app-server
`agentMessage.phase`, the adapter needs its own sentinel/continuation
protocol. CodexUC uses route-owned `final_answer` plus a continuation developer
item; other providers should implement the same contract with provider-specific
mechanics.
