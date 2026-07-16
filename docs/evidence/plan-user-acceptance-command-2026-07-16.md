# Plan User Acceptance Command — 2026-07-16

## Problem

The plan orchestrator previously advanced tasks only through
`npm run plan:commit`. A final user-verification task intentionally used
`expected commit: none`, so even an explicitly accepted result remained
`IN_PROGRESS`. The archive guard then treated the completed scope as unfinished
and required `plan:archive --force`.

## Contract

Final user-verification tasks now carry the explicit marker
`completion: user-acceptance`. After a positive user response, the agent runs:

```bash
npm run plan:accept -- "<short acceptance note>"
```

The command:

- requires an ACTIVE scope and a current `IN_PROGRESS` task;
- requires `expectedCommitMessage: null` and the exact
  `completion: user-acceptance` marker;
- refuses implementation tasks and unmarked external tasks;
- normalizes the acceptance note to one bounded Markdown-safe line;
- marks the acceptance task `DONE` and advances to the next task, if any;
- creates `chore: record plan acceptance <planId>` while staging only the
  active plan and refusing unrelated staged changes;
- leaves `executionScopeStatus: ACTIVE` and never archives the plan.

Scope archival remains a separate user-directed action. Once the acceptance
task is recorded and no other tasks remain, ordinary `npm run plan:archive`
succeeds without `--force`. Forced archival remains reserved for genuinely
unfinished scopes and still requires an explicit forced-close order.

## Verification

`scripts/plan-accept.test.mjs` covers:

- successful completion of the final acceptance task;
- note whitespace/backtick normalization and acceptance-commit recognition;
- advancement from an acceptance task to a later implementation task;
- rejection of a task that still expects an implementation commit;
- rejection of an unmarked `expected commit: none` task;
- end-to-end CLI refusal when unrelated staged changes exist;
- end-to-end acceptance commit followed by ordinary, non-forced archival.

The existing archive tests continue to verify that an ACTIVE scope stays open
after the last implementation commit and that unfinished work remains guarded.
