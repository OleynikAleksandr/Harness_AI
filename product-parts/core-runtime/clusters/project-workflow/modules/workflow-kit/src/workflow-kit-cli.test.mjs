import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cleanGitEnvironment } from "../../workflow-git/src/workflow-git-test-repo.mjs";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(["workflow-kit"], "workflow-kit-cli");
const root = mkdtempSync(path.join(tmpdir(), "workflow-kit-cli-"));
try {
  const { runCli } = await build.load("workflow-kit", "workflow-kit-cli.js");
  const { WorkflowKitFacade } = await build.load(
    "workflow-kit",
    "workflow-kit-facade.js"
  );
  const { WorkflowGitFacade } = await build.load(
    "workflow-git",
    "workflow-git-facade.js"
  );
  const { WorkflowPlanFacade } = await build.load(
    "workflow-plan",
    "workflow-plan-facade.js"
  );
  const env = cleanGitEnvironment();
  const git = new WorkflowGitFacade(undefined, env);
  const kit = new WorkflowKitFacade({ env, git });
  const run = (argv, stdin = "", cwd = root) => {
    const out = { stderr: "", stdout: "" };
    const code = runCli(
      argv,
      {
        cwd,
        env,
        readStdin: () => stdin,
        stderr: (text) => {
          out.stderr += text;
        },
        stdout: (text) => {
          out.stdout += text;
        },
      },
      kit
    );
    return { ...out, code };
  };
  const json = (result) => JSON.parse(result.stdout);

  // Help and usage errors.
  const help = run(["help"]);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /scripts\/workflow task:start <ID>/u);
  assert.equal(run([]).code, 1);
  const unknown = run(["launch"]);
  assert.equal(unknown.code, 1);
  assert.deepEqual(
    { code: json(unknown).code, ok: json(unknown).ok },
    { code: "UNKNOWN_COMMAND", ok: false }
  );
  assert.equal(json(run(["accept"])).code, "USAGE");
  assert.equal(json(run(["task:start", "A", "--confirmed"])).code, "USAGE");
  const textError = run(["scope:create", "--format", "text"]);
  assert.equal(textError.code, 1);
  assert.match(textError.stderr, /^USAGE: --input is required\./u);

  // Inspection and an update of a folder without the Kit.
  assert.equal(json(run(["inspect"])).result.state, "EMPTY");
  const inspected = run(["inspect", "--format", "text"]);
  assert.equal(inspected.code, 0);
  assert.match(inspected.stdout, /^path: .+\nstate: EMPTY\naction: install\n/u);
  assert.match(inspected.stdout, /\nstacks: none\n/u);
  assert.throws(() => JSON.parse(inspected.stdout));
  assert.equal(json(run(["install", "--update"])).code, "NOT_INSTALLED");

  // A folder without the Kit: status says so, operations fail cleanly.
  const bare = json(run(["status"]));
  assert.equal(bare.ok, true);
  assert.equal(bare.result.installed, false);
  assert.equal(json(run(["task:start", "A"])).code, "NOT_INSTALLED");

  // An installed project, addressed from a subdirectory.
  git.init(root);
  git.setConfig(root, "user.name", "Workflow Test");
  git.setConfig(root, "user.email", "workflow@harness-ai.test");
  writeFileSync(path.join(root, ".gitignore"), ".harness/workflow/local/\n");
  const plans = new WorkflowPlanFacade();
  git.transactions.commit(root, {
    files: [".gitignore"],
    message: "chore: bootstrap",
    planPath: ".harness/plans/todo-plan.md",
    planText: plans.render(plans.createEmpty("cli", "CLI")),
    role: "bootstrap",
    scopeId: null,
    taskId: null,
  });
  mkdirSync(path.join(root, "docs"));
  writeFileSync(path.join(root, "docs", "spec.md"), "# Spec\n");
  writeFileSync(
    path.join(root, "scope.json"),
    JSON.stringify({
      acceptance: ["ok"],
      approval: "User approved the CLI scope",
      id: "cli-1",
      objective: "Use the CLI",
      tasks: [
        {
          acceptance: ["notes"],
          commitMessage: "docs: notes",
          files: ["docs/notes.md"],
          id: "N",
          title: "Notes",
        },
      ],
    })
  );
  const sub = path.join(root, "docs");
  const created = run(["scope:create", "--input", "../scope.json"], "", sub);
  assert.equal(created.code, 0, created.stdout);
  assert.equal(json(created).result.scopeId, "cli-1");
  assert.equal(json(run(["status"], "", sub)).result.nextTask.id, "N");
  const autopilot = json(run(["autopilot:status"], "", sub)).result;
  assert.equal(autopilot.nextTask.id, "N");
  assert.equal(autopilot.scope, "ACTIVE");
  assert.equal(autopilot.transactionPending, false);
  const text = run(["status", "--format=text"]);
  assert.match(text.stdout, /scope: cli-1 ACTIVE, result IN_PROGRESS/u);
  assert.match(text.stdout, /next: N \[work\] Notes/u);
  assert.equal(
    json(run(["task:start", "N"])).result.task.status,
    "IN_PROGRESS"
  );
  writeFileSync(path.join(root, "docs", "notes.md"), "# Notes\n");
  const committed = json(
    run(["commit", "--task", "N", "--files", '["docs/notes.md"]'])
  );
  assert.equal(committed.ok, true);
  assert.match(committed.result.commit.sha, /^[0-9a-f]{40}$/u);
  assert.match(
    run(["show-task", "N", "--format", "text"]).stdout,
    /committed: [0-9a-f]{40}/u
  );
  assert.match(
    run(["recover", "--format", "text", "--event", "resume"]).stdout,
    /event: resume/u
  );
  assert.equal(json(run(["recover", "--event", "later"])).code, "USAGE");
  assert.match(run(["validate", "--format", "text"]).stdout, /consistent/u);

  // Hooks: SessionStart reads stdin; git-hook reports through the exit code.
  const hook = run(
    ["hook", "session-start", "--client", "codex"],
    '{"source":"compact"}'
  );
  assert.equal(hook.code, 0);
  assert.match(
    JSON.parse(hook.stdout).hookSpecificOutput.additionalContext,
    /event: compact/u
  );
  assert.equal(
    json(run(["hook", "session-start", "--client", "vim"])).code,
    "USAGE"
  );
  const gitHook = run(["git-hook", "pre-rebase"]);
  assert.equal(gitHook.code, 1);
  assert.match(gitHook.stderr, /UNKNOWN_HOOK/u);

  // The compiled file runs as a program when executed directly.
  const cli = path.join(
    build.directory,
    "workflow-kit",
    "src",
    "workflow-kit-cli.js"
  );
  const direct = spawnSync(process.execPath, [cli, "status", "--root", root], {
    encoding: "utf8",
    env,
  });
  assert.equal(direct.status, 0, direct.stderr);
  assert.equal(JSON.parse(direct.stdout).result.scope.id, "cli-1");
} finally {
  rmSync(root, { force: true, recursive: true });
  await build.cleanup();
}
