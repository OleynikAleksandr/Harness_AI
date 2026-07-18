#!/usr/bin/env node
import { strict as assert } from "node:assert/strict";
import { markAcceptanceDone, markCommitDone, readState } from "./plan.mjs";

function buildPlan({
  currentTaskId = "harness-ai.phase1.stream1.task1",
  expectedCommitMessage = null,
  taskLine,
  tail = "",
}) {
  return `# Plan
<!-- harness-plan-state:start -->
\`\`\`json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "multiline-test-2026-07-18",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "${currentTaskId}",
  "expectedCommitMessage": ${JSON.stringify(expectedCommitMessage)},
  "debt": null
}
\`\`\`
<!-- harness-plan-state:end -->

${taskLine}
${tail}`;
}

// Wrapped current task: the Result record must land at the end of the
// logical row (after the last continuation line), not in the middle of the
// wrapped sentence.
const wrappedCurrentPlan = buildPlan({
  expectedCommitMessage: "feat: wrapped current",
  taskLine: `1. [IN_PROGRESS] \`harness-ai.phase1.stream1.task1\` Implement the feature with
   a long description that wraps onto a continuation line (scope: \`x\`;
   expected commit: \`feat: wrapped current\`).`,
  tail: "2. [TODO] Git Commit: `feat: wrapped current` (hash: TBD)\n",
});
const wrappedCurrentDone = markCommitDone(
  wrappedCurrentPlan,
  readState(wrappedCurrentPlan),
  "feat: wrapped current"
);
assert.match(wrappedCurrentDone, /1\. \[DONE\] `harness-ai/u);
assert.equal(
  wrappedCurrentDone.includes(
    "expected commit: `feat: wrapped current`). Result: Completed in commit `feat: wrapped current`."
  ),
  true
);
assert.equal(
  wrappedCurrentDone.includes(
    "Implement the feature with Result: Completed in commit"
  ),
  false
);
assert.match(
  wrappedCurrentDone,
  /2\. \[DONE\] Git Commit: `feat: wrapped current` \(hash: self\)/u
);
const wrappedCurrentState = readState(wrappedCurrentDone);
assert.equal(wrappedCurrentState.currentTaskId, null);
assert.equal(wrappedCurrentState.expectedCommitMessage, null);

// Wrapped NEXT task: `expected commit:` and its message may sit on
// continuation lines; the state machine must still adopt them (the 2026-07-18
// incident silently recorded `expectedCommitMessage: null`).
const wrappedNextPlan = buildPlan({
  expectedCommitMessage: "feat: first",
  taskLine:
    "1. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` First task (scope: `x`; expected commit: `feat: first`).",
  tail: `2. [TODO] Git Commit: \`feat: first\` (hash: TBD)
3. [TODO] \`harness-ai.phase2.stream1.task1\` Second task whose description wraps
   onto a continuation line holding the scope (\`x\`) and the
   expected commit:
   \`feat: second\`).
4. [TODO] Git Commit: \`feat: second\` (hash: TBD)
`,
});
const wrappedNextDone = markCommitDone(
  wrappedNextPlan,
  readState(wrappedNextPlan),
  "feat: first"
);
const wrappedNextState = readState(wrappedNextDone);
assert.equal(wrappedNextState.currentTaskId, "harness-ai.phase2.stream1.task1");
assert.equal(wrappedNextState.expectedCommitMessage, "feat: second");
assert.match(wrappedNextDone, /3\. \[IN_PROGRESS\] `harness-ai\.phase2/u);
assert.equal(
  wrappedNextDone.includes(
    "onto a continuation line holding the scope (`x`) and the"
  ),
  true
);

// Wrapped acceptance task: the `completion: user-acceptance` marker may sit on
// a continuation line; acceptance must succeed and record at the row end.
const wrappedAcceptancePlan = buildPlan({
  taskLine: `1. [IN_PROGRESS] \`harness-ai.phase1.stream1.task1\` User retests the workflow in
   the packaged app thoroughly (completion: user-acceptance; scope: user
   workflow; expected commit: none).`,
});
const wrappedAccepted = markAcceptanceDone(
  wrappedAcceptancePlan,
  readState(wrappedAcceptancePlan),
  "Работает"
);
const wrappedAcceptedState = readState(wrappedAccepted);
assert.equal(wrappedAcceptedState.currentTaskId, null);
assert.match(wrappedAccepted, /1\. \[DONE\] `harness-ai/u);
assert.equal(
  wrappedAccepted.includes(
    "expected commit: none). Result: User acceptance recorded"
  ),
  true
);

// Wrapped acceptance followed by a wrapped implementation task: the chain
// advances and parses the next expected commit from continuation lines.
const chainedPlan = buildPlan({
  taskLine: `1. [IN_PROGRESS] \`harness-ai.phase1.stream1.task1\` User retests the workflow
   (completion: user-acceptance; scope: user workflow;
   expected commit: none).`,
  tail: `2. [TODO] \`harness-ai.phase2.stream1.task1\` Follow-up implementation whose
   description wraps (scope: \`x\`;
   expected commit: \`feat: follow-up\`).
3. [TODO] Git Commit: \`feat: follow-up\` (hash: TBD)
`,
});
const chainedAccepted = markAcceptanceDone(chainedPlan, readState(chainedPlan));
const chainedState = readState(chainedAccepted);
assert.equal(chainedState.currentTaskId, "harness-ai.phase2.stream1.task1");
assert.equal(chainedState.expectedCommitMessage, "feat: follow-up");
assert.match(chainedAccepted, /2\. \[IN_PROGRESS\] `harness-ai\.phase2/u);

// Single-line rows keep working unchanged (guard against over-capture).
const singleLinePlan = buildPlan({
  expectedCommitMessage: "feat: single",
  taskLine:
    "1. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` Single task (scope: `x`; expected commit: `feat: single`).",
  tail: `2. [TODO] Git Commit: \`feat: single\` (hash: TBD)
3. [TODO] \`harness-ai.phase2.stream1.task1\` Next single task (scope: \`x\`; expected commit: \`feat: next-single\`).
4. [TODO] Git Commit: \`feat: next-single\` (hash: TBD)
`,
});
const singleLineDone = markCommitDone(
  singleLinePlan,
  readState(singleLinePlan),
  "feat: single"
);
const singleLineState = readState(singleLineDone);
assert.equal(singleLineState.currentTaskId, "harness-ai.phase2.stream1.task1");
assert.equal(singleLineState.expectedCommitMessage, "feat: next-single");
assert.equal(
  singleLineDone.includes(
    "expected commit: `feat: single`). Result: Completed in commit `feat: single`."
  ),
  true
);

console.log("plan-multiline: OK");
