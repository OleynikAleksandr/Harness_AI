#!/usr/bin/env node
import { strict as assert } from "node:assert/strict";
import {
  buildClosedPlan,
  markCommitDone,
  planHasActiveTask,
  readState,
} from "./plan.mjs";

// A closed plan parses back as an inactive (NONE) scope.
const closed = buildClosedPlan("main");
const state = readState(closed);
assert.equal(state.executionScopeStatus, "NONE");
assert.equal(state.planId, null);
assert.equal(state.currentTaskId, null);
assert.equal(state.branch, "main");

// The archive guard sees unfinished work as active.
assert.equal(planHasActiveTask("1. [IN_PROGRESS] `x` foo"), true);
assert.equal(planHasActiveTask("2. [TODO] Git Commit: `m` (hash: TBD)"), true);
assert.equal(planHasActiveTask("1. [DONE] `x` foo"), false);

const PLAN_HEADER = `# Plan
<!-- harness-plan-state:start -->
\`\`\`json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "test-2026-06-28",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.phase1.stream1.task1",
  "expectedCommitMessage": "feat: a",
  "debt": null
}
\`\`\`
<!-- harness-plan-state:end -->
`;

// Committing the LAST task keeps the scope ACTIVE (closing is user-directed only).
const lastTaskPlan = `${PLAN_HEADER}
1. [IN_PROGRESS] \`harness-ai.phase1.stream1.task1\` do a (scope: \`x\`; expected commit: \`feat: a\`).
2. [TODO] Git Commit: \`feat: a\` (hash: TBD)
`;
const afterLast = readState(
  markCommitDone(lastTaskPlan, readState(lastTaskPlan), "feat: a")
);
assert.equal(afterLast.executionScopeStatus, "ACTIVE");
assert.equal(afterLast.currentTaskId, null);
assert.equal(afterLast.expectedCommitMessage, null);

// With a next task, the commit still advances to it (no regression).
const twoTaskPlan = `${PLAN_HEADER}
1. [IN_PROGRESS] \`harness-ai.phase1.stream1.task1\` do a (scope: \`x\`; expected commit: \`feat: a\`).
2. [TODO] Git Commit: \`feat: a\` (hash: TBD)
3. [TODO] \`harness-ai.phase2.stream1.task1\` do b (scope: \`y\`; expected commit: \`feat: b\`).
4. [TODO] Git Commit: \`feat: b\` (hash: TBD)
`;
const afterFirst = readState(
  markCommitDone(twoTaskPlan, readState(twoTaskPlan), "feat: a")
);
assert.equal(afterFirst.executionScopeStatus, "ACTIVE");
assert.equal(afterFirst.currentTaskId, "harness-ai.phase2.stream1.task1");
assert.equal(afterFirst.expectedCommitMessage, "feat: b");

console.log("plan-archive: OK");
