import assert from "node:assert/strict";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(
  ["workflow-autopilot"],
  "workflow-autopilot-decision"
);
try {
  const { WorkflowAutopilotFacade } = await build.load(
    "workflow-autopilot",
    "workflow-autopilot-facade.js"
  );
  const autopilot = new WorkflowAutopilotFacade();
  const on = autopilot.initialState(3, true);
  const status = (extra = {}) => ({
    blockedReason: null,
    delivery: "IN_PROGRESS",
    head: "h2",
    nextTask: { id: "T008", kind: "work", status: "TODO", title: "Next" },
    revision: 5,
    scope: "ACTIVE",
    transactionPending: false,
    ...extra,
  });
  const turn = (extra = {}) => ({
    before: { head: "h1", revision: 4 },
    outcome: "completed",
    userMessage: false,
    ...extra,
  });
  const reason = (state, s, t) => autopilot.decide(state, s, t).reason;

  assert.equal(autopilot.initialState().enabled, false);
  assert.equal(autopilot.initialState().maxContinues, 40);
  assert.equal(reason(autopilot.initialState(), status(), turn()), "disabled");
  assert.equal(reason(on, status(), turn({ outcome: "error" })), "turn-error");
  assert.equal(
    reason(on, status(), turn({ outcome: "cancelled" })),
    "turn-error"
  );
  assert.equal(
    reason(on, status(), turn({ userMessage: true })),
    "user-message"
  );
  assert.equal(reason(on, status({ scope: "NONE" }), turn()), "no-scope");
  const blocked = autopilot.decide(
    on,
    status({ blockedReason: "needs input", scope: "BLOCKED" }),
    turn()
  );
  assert.deepEqual(blocked, {
    action: "stop",
    detail: "needs input",
    reason: "blocked",
  });
  assert.equal(
    reason(on, status({ transactionPending: true }), turn()),
    "transaction-pending"
  );
  assert.equal(
    reason(on, status({ delivery: "READY_FOR_ACCEPTANCE" }), turn()),
    "ready-for-acceptance"
  );
  assert.equal(
    reason(on, status({ delivery: "ACCEPTED" }), turn()),
    "ready-for-acceptance"
  );
  assert.equal(reason(on, status({ nextTask: null }), turn()), "blocked");
  assert.equal(
    reason(
      on,
      status({
        nextTask: { id: "T9", kind: "delivery", status: "TODO", title: "Ship" },
      }),
      turn()
    ),
    "delivery-confirmation"
  );
  assert.equal(
    reason(on, status({ head: "h1", revision: 4 }), turn()),
    "no-progress"
  );
  assert.equal(reason({ ...on, continues: 3 }, status(), turn()), "limit");

  // Continue: instruction text, counter and message with a fresh packet.
  const go = autopilot.decide(on, status(), turn());
  assert.deepEqual(go, {
    action: "continue",
    taskId: "T008",
    text: "Continue the workflow: run `scripts/workflow task:start T008` if it is not started, then implement it and commit.",
  });
  const started = autopilot.decide(
    on,
    status({
      nextTask: {
        id: "T008",
        kind: "work",
        status: "IN_PROGRESS",
        title: "Next",
      },
    }),
    turn()
  );
  assert.match(
    started.text,
    /task T008 is in progress; implement it and commit with `scripts\/workflow commit --task T008`/u
  );
  // A delivery task already started by the user continues normally.
  assert.equal(
    autopilot.decide(
      on,
      status({
        nextTask: {
          id: "T9",
          kind: "delivery",
          status: "IN_PROGRESS",
          title: "Ship",
        },
      }),
      turn()
    ).action,
    "continue"
  );
  const after = autopilot.advance(on, go);
  assert.equal(after.continues, 1);
  assert.equal(
    autopilot.advance(
      after,
      autopilot.decide(after, status(), turn({ userMessage: true }))
    ).continues,
    0
  );
  assert.equal(
    autopilot.advance(
      after,
      autopilot.decide(after, status({ scope: "NONE" }), turn())
    ).continues,
    1
  );
  assert.equal(
    autopilot.message(go, "# Workflow recovery packet\n"),
    `${go.text}\n\n<workflow-recovery>\n# Workflow recovery packet\n</workflow-recovery>\n`
  );
  assert.equal(autopilot.message(go, null), `${go.text}\n`);
} finally {
  await build.cleanup();
}
