import assert from "node:assert/strict";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(
  ["workflow-platform", "workflow-plan", "workflow-recovery"],
  "workflow-recovery-packet"
);
try {
  const { WorkflowRecoveryFacade } = await build.load(
    "workflow-recovery",
    "workflow-recovery-facade.js"
  );
  const recovery = new WorkflowRecoveryFacade();
  const task = (id, status, extra = {}) => ({
    acceptance: ["it works"],
    checks: [],
    commitMessage: `feat: ${id}`,
    confirmation: null,
    context: [],
    dependencies: [],
    docsWaiver: null,
    files: [`src/${id}.ts`],
    fixes: null,
    id,
    iteration: 1,
    kind: "work",
    roundId: "R2",
    status,
    title: `Task ${id}`,
    why: "because",
    ...extra,
  });
  const digest = (n) => ({
    contracts: [`docs/m${n}.md: changed`],
    decisions: [`decision ${n}`],
    references: [],
    result: `Round ${n} delivered part ${n}.`,
  });
  const rounds = [1, 2, 3, 4, 5].map((n) => ({
    digest: digest(n),
    id: `R${n}`,
    kind: "implementation",
    status: "CLOSED",
    title: `Round ${n}`,
  }));
  rounds.push({
    digest: null,
    id: "R6",
    kind: "fixes",
    status: "OPEN",
    title: "Fixes",
  });
  const docs = {
    "docs/spec.md":
      "# Spec\n\nIntro.\n\n## Process\n\nProcess text.\n\n### Detail\n\nMore.\n\n## Other\n\nOther text.\n",
    "docs/big.md": `# Big\n\n${"x".repeat(5000)}\n\n## Small Part\n\nsmall\n`,
    "docs/optional.md": "# Optional\n",
  };
  const plan = (overrides = {}) => ({
    currentTaskId: "T003",
    lastClosed: null,
    projectId: "p-1",
    projectName: "Demo",
    revision: 12,
    rounds,
    schema: "harness-workflow-plan/1",
    scope: {
      acceptance: ["All tests pass"],
      acceptanceNote: null,
      approval: { at: "2026-11-03T10:00:00Z", text: "approved by the user" },
      baselineCommit: "a".repeat(40),
      blockedReason: null,
      context: [{ heading: "Process", path: "docs/spec.md", required: true }],
      decisions: Array.from({ length: 7 }, (_, index) => ({
        at: `2026-11-0${index + 1}`,
        text: `choice ${index + 1}`,
      })),
      delivery: "IN_PROGRESS",
      id: "scope-1",
      objective: "Ship the feature",
      spec: "docs/spec.md",
      status: "ACTIVE",
    },
    tasks: [
      task("T001", "DONE"),
      task("T002", "DONE"),
      task("T003", "IN_PROGRESS", {
        context: [
          { heading: "Small Part", path: "docs/big.md", required: true },
          { path: "docs/optional.md", required: false },
          { path: "docs/missing.md", required: true },
        ],
        fixes: "T001",
        roundId: "R6",
      }),
      task("T004", "TODO"),
      task("T005", "TODO"),
      task("T006", "TODO"),
      task("T007", "TODO"),
      task("DOCS-R6", "TODO", { kind: "docs" }),
    ],
    ...overrides,
  });
  const input = (overrides = {}) => ({
    budgetBytes: 32_000,
    changes: ["notes.txt"],
    event: "startup",
    head: "b".repeat(40),
    plan: plan(),
    quality: { stacks: ["node"], status: "CONFIGURED" },
    readDocument: (file) => docs[file] ?? null,
    taskCommits: { T001: "c".repeat(40), T002: "d".repeat(40) },
    transaction: null,
    verification: {
      commit: "d".repeat(40),
      reports: [
        {
          ok: false,
          results: [{ id: "tests", output: "1 failing", status: "failed" }],
          stage: "commit",
        },
      ],
    },
    ...overrides,
  });

  // Full budget: every section in priority order, header counts its own bytes.
  const full = recovery.build(input());
  assert.deepEqual(full.included, [
    "state",
    "next",
    "objective",
    "task",
    "upcoming",
    "recent",
    "rounds",
    "decisions",
    "changes",
    "verification",
    "document docs/spec.md",
    "document docs/big.md",
  ]);
  assert.equal(full.bytes, Buffer.byteLength(full.text, "utf8"));
  assert.match(
    full.text,
    new RegExp(`bytes: ${full.bytes} / budget: 32000\\n`, "u")
  );
  assert.equal(full.overBudget, false);
  assert.equal(full.truncated, false);
  assert.match(full.text, /## next\nContinue T003: Task T003/u);
  assert.match(full.text, /fixes: T001 cccccccc — Task T001/u);
  assert.match(
    full.text,
    /- T004 \[work\] Task T004\n- T005 \[work\] Task T005\n- T006 \[work\] Task T006\nremaining after these: 2/u
  );
  assert.match(
    full.text,
    /- T001 cccccccc Task T001\n- T002 dddddddd Task T002/u
  );
  assert.match(full.text, /- R1 Round 1: Round 1 delivered part 1\./u);
  assert.match(full.text, /### R5 Round 5 \(CLOSED\)/u);
  assert.doesNotMatch(full.text, /### R2 /u);
  assert.doesNotMatch(full.text, /choice 2\b/u);
  assert.match(full.text, /choice 7/u);
  assert.match(full.text, /- tests failed:\n1 failing/u);
  assert.ok(
    full.references.some((line) => line.startsWith("docs/optional.md"))
  );
  assert.ok(full.references.includes("docs/missing.md: missing file"));
  assert.doesNotMatch(full.text, /harness-workflow-plan|AGENTS\.md content/u);

  // Tight budget: optional sections and the big document move to references;
  // the heading section of a document is used when the whole does not fit.
  const tight = recovery.build(input({ budgetBytes: 4000 }));
  assert.ok(tight.bytes <= 4000);
  assert.ok(tight.included.includes("document docs/big.md#Small Part"));
  assert.ok(
    tight.references.some(
      (line) =>
        line.startsWith("docs/big.md#Small Part") &&
        line.endsWith("(only its section is included)")
    )
  );

  const tiny = recovery.build(input({ budgetBytes: 1700 }));
  assert.ok(tiny.bytes <= 1700, `tiny packet is ${tiny.bytes} bytes`);
  for (const name of [
    "state",
    "next",
    "objective",
    "task",
    "upcoming",
    "recent",
    "changes",
  ]) {
    assert.ok(tiny.included.includes(name), name);
  }
  assert.ok(tiny.omitted.length > 0);
  assert.match(
    tiny.text,
    new RegExp(`omitted: ${tiny.omitted.join(", ")}\\n`, "u")
  );
  assert.ok(tiny.omitted.every((name) => !tiny.included.includes(name)));

  // Mandatory sections larger than the budget: long task fields get a marker.
  const longPlan = plan();
  longPlan.tasks[2] = {
    ...longPlan.tasks[2],
    context: [],
    why: "w".repeat(6000),
  };
  const truncated = recovery.build(
    input({ budgetBytes: 2000, plan: longPlan })
  );
  assert.equal(truncated.truncated, true);
  assert.match(
    truncated.text,
    /\[truncated: \d+ bytes, run: scripts\/workflow show-task T003\]/u
  );
  assert.ok(
    truncated.bytes <= 2000,
    `truncated packet is ${truncated.bytes} bytes`
  );

  // Next-step variants.
  const next = (overrides, extra = {}) =>
    recovery
      .build(input({ plan: plan(overrides), ...extra }))
      .sections.find((section) => section.name === "next").text;
  assert.match(next({ scope: null }), /^No active scope/u);
  assert.match(
    next(
      {},
      {
        transaction: {
          error: null,
          id: "tx",
          phase: "FAILED",
          role: "implementation",
          taskId: "T003",
        },
      }
    ),
    /scripts\/workflow repair/u
  );
  assert.match(
    next({
      scope: { ...plan().scope, blockedReason: "waiting", status: "BLOCKED" },
    }),
    /^BLOCKED: waiting/u
  );
  assert.match(
    next({ scope: { ...plan().scope, delivery: "READY_FOR_ACCEPTANCE" } }),
    /READY_FOR_ACCEPTANCE/u
  );
  assert.match(
    next({
      currentTaskId: null,
      tasks: [task("T009", "TODO", { kind: "delivery" })],
    }),
    /delivery: ask the user to confirm/u
  );
  assert.match(
    next({ currentTaskId: null, tasks: [task("T010", "TODO")] }),
    /^Start T010 via `scripts\/workflow task:start T010`/u
  );

  // Heading extraction by text or slug, nested headings included.
  assert.equal(
    recovery.section(docs["docs/spec.md"], "process"),
    "## Process\n\nProcess text.\n\n### Detail\n\nMore."
  );
  assert.equal(recovery.section(docs["docs/spec.md"], "Absent"), null);
} finally {
  await build.cleanup();
}
