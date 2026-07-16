#!/usr/bin/env node
import { strict as assert } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptanceCommitIsRecorded,
  buildAcceptanceCommitMessage,
  markAcceptanceDone,
  readState,
} from "./plan.mjs";

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
  "planId": "acceptance-test-2026-07-16",
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

const acceptanceTask =
  "1. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` User verifies the result (completion: user-acceptance; scope: user workflow; expected commit: none).";
const plan = buildPlan({ taskLine: acceptanceTask });
const accepted = markAcceptanceDone(
  plan,
  readState(plan),
  "Все работает\nхорошо, `готово`"
);
const acceptedState = readState(accepted);
const acceptanceCommitMessage = buildAcceptanceCommitMessage(
  "acceptance-test-2026-07-16"
);

assert.equal(acceptedState.executionScopeStatus, "ACTIVE");
assert.equal(acceptedState.currentTaskId, null);
assert.equal(acceptedState.expectedCommitMessage, null);
assert.match(accepted, /1\. \[DONE\].*completion: user-acceptance/u);
assert.match(accepted, /Все работает хорошо, 'готово'/u);
assert.equal(
  acceptanceCommitIsRecorded(accepted, acceptanceCommitMessage),
  true
);

const nextTaskPlan = buildPlan({
  taskLine: acceptanceTask,
  tail: `2. [TODO] \`harness-ai.phase2.stream1.task1\` Continue implementation (scope: \`x\`; expected commit: \`feat: next\`).
3. [TODO] Git Commit: \`feat: next\` (hash: TBD)
`,
});
const afterAcceptance = markAcceptanceDone(
  nextTaskPlan,
  readState(nextTaskPlan)
);
const nextState = readState(afterAcceptance);
assert.equal(nextState.currentTaskId, "harness-ai.phase2.stream1.task1");
assert.equal(nextState.expectedCommitMessage, "feat: next");
assert.match(
  afterAcceptance,
  /2\. \[IN_PROGRESS\] `harness-ai\.phase2\.stream1\.task1`/u
);

const implementationPlan = buildPlan({
  expectedCommitMessage: "feat: implementation",
  taskLine:
    "1. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` Implement code (scope: `x`; expected commit: `feat: implementation`).",
});
assert.throws(
  () => markAcceptanceDone(implementationPlan, readState(implementationPlan)),
  /expects commit/u
);

const unmarkedPlan = buildPlan({
  taskLine:
    "1. [IN_PROGRESS] `harness-ai.phase1.stream1.task1` External work (scope: user workflow; expected commit: none).",
});
assert.throws(
  () => markAcceptanceDone(unmarkedPlan, readState(unmarkedPlan)),
  /completion: user-acceptance/u
);

function run(repo, command, args) {
  const result = spawnSync(command, args, {
    cwd: repo,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`
  );
  return result.stdout.trim();
}

function runFailure(repo, command, args) {
  const result = spawnSync(command, args, {
    cwd: repo,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `${command} unexpectedly succeeded`);
  return `${result.stdout}\n${result.stderr}`;
}

const integrationRepo = mkdtempSync(join(tmpdir(), "harness-plan-accept-"));
try {
  const copiedScript = join(integrationRepo, "scripts", "plan.mjs");
  const integrationPlanPath = join(
    integrationRepo,
    ".harness",
    "plans",
    "todo-plan.md"
  );
  mkdirSync(dirname(copiedScript), { recursive: true });
  mkdirSync(dirname(integrationPlanPath), { recursive: true });
  copyFileSync(
    fileURLToPath(new URL("./plan.mjs", import.meta.url)),
    copiedScript
  );
  writeFileSync(integrationPlanPath, plan, "utf8");

  run(integrationRepo, "git", ["init", "--quiet"]);
  run(integrationRepo, "git", ["config", "user.name", "Harness Test"]);
  run(integrationRepo, "git", [
    "config",
    "user.email",
    "harness-test@example.invalid",
  ]);
  run(integrationRepo, "git", ["add", "."]);
  run(integrationRepo, "git", ["commit", "--quiet", "-m", "test baseline"]);

  writeFileSync(
    join(integrationRepo, "staged-fixture.txt"),
    "fixture\n",
    "utf8"
  );
  run(integrationRepo, "git", ["add", "staged-fixture.txt"]);
  assert.match(
    runFailure(integrationRepo, "node", [
      "scripts/plan.mjs",
      "accept",
      "Must not absorb staged work",
    ]),
    /unrelated staged changes/u
  );
  assert.equal(
    readState(readFileSync(integrationPlanPath, "utf8")).currentTaskId,
    "harness-ai.phase1.stream1.task1"
  );
  run(integrationRepo, "git", [
    "commit",
    "--quiet",
    "-m",
    "test staged fixture",
  ]);

  run(integrationRepo, "node", [
    "scripts/plan.mjs",
    "accept",
    "User confirmed the workflow",
  ]);
  const recordedPlan = readFileSync(integrationPlanPath, "utf8");
  assert.equal(readState(recordedPlan).executionScopeStatus, "ACTIVE");
  assert.equal(readState(recordedPlan).currentTaskId, null);
  assert.equal(
    run(integrationRepo, "git", ["log", "-1", "--pretty=%s"]),
    acceptanceCommitMessage
  );
  assert.equal(
    existsSync(join(integrationRepo, ".harness", "plans", "archive")),
    false
  );

  run(integrationRepo, "node", ["scripts/plan.mjs", "archive"]);
  assert.equal(
    readState(readFileSync(integrationPlanPath, "utf8")).executionScopeStatus,
    "NONE"
  );
  assert.equal(
    existsSync(
      join(
        integrationRepo,
        ".harness",
        "plans",
        "archive",
        "acceptance-test-2026-07-16.md"
      )
    ),
    true
  );
} finally {
  rmSync(integrationRepo, { recursive: true, force: true });
}

console.log("plan-accept: OK");
