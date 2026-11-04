import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";
import { cleanGitEnvironment } from "./workflow-git-test-repo.mjs";

const build = await buildWorkflowModules(
  ["workflow-platform", "workflow-git"],
  "workflow-git-transaction"
);
const root = mkdtempSync(path.join(tmpdir(), "workflow-git-tx-"));
const PLAN = ".harness/plans/todo-plan.md";
const write = (file, text) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
};
const read = (file) => readFileSync(path.join(root, file), "utf8");
try {
  const { WorkflowGitFacade } = await build.load(
    "workflow-git",
    "workflow-git-facade.js"
  );
  const git = new WorkflowGitFacade(undefined, cleanGitEnvironment());
  const tx = git.transactions;
  git.init(root);
  git.setConfig(root, "user.name", "Workflow Test");
  git.setConfig(root, "user.email", "workflow@harness-ai.test");
  write(".gitignore", ".harness/workflow/local/\n");

  // Bootstrap commit creates the plan file and carries trailers.
  const boot = tx.commit(root, {
    files: [".gitignore"],
    message: "chore: bootstrap",
    planPath: PLAN,
    planText: "plan v1\n",
    role: "bootstrap",
    scopeId: null,
    taskId: null,
  });
  assert.equal(git.head(root), boot.sha);
  const [bootCommit] = git.history(root, null);
  assert.deepEqual(bootCommit.trailers["Workflow-Role"], ["bootstrap"]);
  assert.equal(bootCommit.trailers["Workflow-Transaction"].length, 1);
  assert.equal(tx.journal(root), null);
  assert.ok(existsSync(git.localPath(root, "last-commit.json")));

  // Task baseline: pre-existing edits and private files stay out of the task commit.
  write("notes.txt", "user draft");
  const identity = { iteration: 1, scopeId: "demo", taskId: "T001" };
  git.beginTask(root, identity);
  write("src/a.ts", "export const a = 1;\n");
  write(".env", "SECRET=1");
  let selection = git.selectTaskFiles(root, identity);
  assert.deepEqual(selection.selected, ["src/a.ts"]);
  assert.deepEqual(selection.excluded.sort(), [".env", "notes.txt"]);
  const done = tx.commit(root, {
    excluded: selection.excluded,
    files: selection.selected,
    iteration: 1,
    message: "feat: a",
    planPath: PLAN,
    planText: "plan v2\n",
    role: "implementation",
    scopeId: "demo",
    taskId: "T001",
  });
  assert.deepEqual(git.commitPaths(root, done.sha), [PLAN, "src/a.ts"]);
  assert.deepEqual(done.excluded.sort(), [".env", "notes.txt"]);
  const taskCommit = git.history(root, boot.sha)[0];
  assert.deepEqual(taskCommit.trailers["Workflow-Task"], ["T001"]);
  assert.deepEqual(taskCommit.trailers["Workflow-Iteration"], ["1"]);
  assert.equal(read("notes.txt"), "user draft");

  // Re-editing a pre-existing file requires an explicit choice.
  const second = { iteration: 1, scopeId: "demo", taskId: "T002" };
  git.beginTask(root, second);
  write("notes.txt", "user draft, continued");
  assert.throws(
    () => git.selectTaskFiles(root, second),
    (e) => e.code === "EXISTING_EDITS_CHANGED"
  );
  selection = git.selectTaskFiles(root, second, ["notes.txt"]);
  assert.deepEqual(selection.selected, ["notes.txt"]);
  assert.throws(
    () => git.selectTaskFiles(root, second, [".harness/workflow/config.json"]),
    (e) => e.code === "MANAGED_FILE"
  );
  assert.throws(
    () => git.selectTaskFiles(root, { ...second, taskId: "T404" }),
    (e) => e.code === "TASK_FILES_UNKNOWN"
  );

  // Foreign staged files block the transaction.
  write("other.txt", "x");
  git.git.run(root, ["add", "other.txt"]);
  assert.throws(
    () =>
      tx.commit(root, {
        files: ["notes.txt"],
        message: "feat: notes",
        planPath: PLAN,
        planText: "plan v3\n",
        role: "implementation",
        scopeId: "demo",
        taskId: "T002",
      }),
    (e) => e.code === "FOREIGN_STAGED"
  );
  git.git.run(root, ["reset", "-q", "other.txt"]);

  // A failing hook restores plan and index and keeps the edits.
  const hook = path.join(git.gitPath(root, "hooks"), "pre-commit");
  mkdirSync(path.dirname(hook), { recursive: true });
  writeFileSync(hook, "#!/bin/sh\necho 'lint failed' >&2\nexit 1\n");
  chmodSync(hook, 0o755);
  const before = read(PLAN);
  assert.throws(
    () =>
      tx.commit(root, {
        files: ["notes.txt"],
        message: "feat: notes",
        planPath: PLAN,
        planText: "plan v3\n",
        prepare: (files) => write(files[0], "formatted draft"),
        role: "implementation",
        scopeId: "demo",
        taskId: "T002",
      }),
    (e) =>
      e.code === "COMMIT_FAILED" &&
      e.details.retryable === true &&
      e.details.output.includes("lint failed")
  );
  assert.equal(read(PLAN), before);
  assert.equal(
    read("notes.txt"),
    "formatted draft",
    "prepare-stage edits stay in the working tree"
  );
  assert.deepEqual(git.changes(root).staged, []);
  assert.equal(tx.journal(root), null);
  rmSync(hook);

  // Retry succeeds; nothing-to-commit is reported without leaving a journal.
  const retried = tx.commit(root, {
    files: ["notes.txt"],
    message: "feat: notes",
    planPath: PLAN,
    planText: "plan v3\n",
    role: "implementation",
    scopeId: "demo",
    taskId: "T002",
  });
  assert.equal(git.head(root), retried.sha);
  assert.throws(
    () =>
      tx.commit(root, {
        files: [],
        message: "chore: none",
        planPath: PLAN,
        planText: "plan v3\n",
        role: "docs",
        scopeId: "demo",
        taskId: null,
      }),
    (e) => e.code === "NOTHING_TO_COMMIT"
  );
  assert.equal(tx.journal(root), null);
  assert.equal(tx.finish(root), null);
  assert.equal(tx.cancel(root), false);
  console.log("workflow-git transaction tests passed");
} finally {
  rmSync(root, { force: true, recursive: true });
  await build.cleanup();
}
