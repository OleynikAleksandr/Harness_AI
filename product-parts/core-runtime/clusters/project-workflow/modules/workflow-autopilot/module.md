# Workflow Autopilot Module

## Responsibility

The pure decision whether the host continues the workflow with another
turn after a turn ends. It keeps the rule "one task, one commit, one turn"
without making the user type "Continue" after every task. Running the
decision (state per session, sending turns, events) belongs to Core.

## Public Facade

`WorkflowAutopilotFacade` (class, singleton `workflowAutopilotFacade`).

## Contract

- `initialState(maxContinues = 40, enabled = false)` →
  `{enabled, continues, maxContinues}`.
- `decide(state, status, turn)`:
  - `status` — the project after the turn: `{scope ACTIVE|BLOCKED|NONE,
    blockedReason, delivery, transactionPending, nextTask {id, kind,
    status, title} | null, revision, head}`;
  - `turn` — `{outcome completed|error|cancelled, userMessage, before
    {revision, head}}`;
  - result `{action: "continue", taskId, text}` or
    `{action: "stop", reason, detail}`.
- Stop reasons, checked in this order:
  1. `disabled` — autopilot is off for the session;
  2. `turn-error` — the turn failed or was cancelled;
  3. `user-message` — the user wrote; the autopilot yields;
  4. `no-scope`;
  5. `blocked` — the scope is blocked (detail is the reason);
  6. `transaction-pending` — unfinished transaction or failed check;
  7. `ready-for-acceptance` — `READY_FOR_ACCEPTANCE` or `ACCEPTED`;
  8. `blocked` — no task is ready;
  9. `delivery-confirmation` — the next task is a `delivery` task that has
     not started;
  10. `no-progress` — plan revision and HEAD did not change;
  11. `limit` — `continues` reached `maxContinues`.
- Continue text: `Continue the workflow: run \`scripts/workflow task:start
  <ID>\` if it is not started, then implement it and commit.`; for a task in
  progress it names `scripts/workflow commit --task <ID>`.
- `advance(state, decision)` counts a continue and resets the counter on
  `user-message`.
- `message(decision, packet)` — the user turn the host sends: the
  instruction plus the fresh packet inside `<workflow-recovery>` tags.

## Dependencies

None. Node built-ins only.

## Tests

`src/workflow-autopilot-decision.test.mjs` — every stop reason, both
continue texts, a started delivery task, counters, the turn message.
