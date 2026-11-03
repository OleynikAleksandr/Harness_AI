import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cleanGitEnvironment } from "../../workflow-git/src/workflow-git-test-repo.mjs";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(
  ["workflow-kit", "workflow-installer"],
  "workflow-installer-doctor"
);
const sandbox = mkdtempSync(path.join(tmpdir(), "workflow-doctor-"));
try {
  const { WorkflowGitFacade } = await build.load(
    "workflow-git",
    "workflow-git-facade.js"
  );
  const { WorkflowInstallerFacade } = await build.load(
    "workflow-installer",
    "workflow-installer-facade.js"
  );
  const identity = path.join(sandbox, "gitconfig");
  writeFileSync(
    identity,
    "[user]\n\tname = Workflow Test\n\temail = workflow@example.invalid\n"
  );
  const env = { ...cleanGitEnvironment(), GIT_CONFIG_GLOBAL: identity };
  const git = new WorkflowGitFacade(undefined, env);
  const installer = new WorkflowInstallerFacade(git);
  const bundle = `import { readFileSync } from "node:fs";
import { runCli } from ${JSON.stringify(path.join(build.directory, "workflow-kit", "src", "workflow-kit-cli.js"))};
process.exitCode = runCli(process.argv.slice(2), { cwd: process.cwd(), env: process.env, readStdin: () => { try { return readFileSync(0, "utf8"); } catch { return ""; } }, stderr: (t) => process.stderr.write(t), stdout: (t) => process.stdout.write(t) });
`;
  const runtime = { executable: process.execPath, mode: "node" };
  const root = path.join(sandbox, "project");
  installer.install(root, { bundle, name: "Doctor", runtime });
  writeFileSync(path.join(root, "package.json"), "{}\n");
  const healthy = () => "24.1.0";
  const statusOf = (report) =>
    Object.fromEntries(report.checks.map((item) => [item.id, item.status]));

  // A fresh installation is healthy.
  const first = installer.doctor(root, { env, probe: healthy });
  assert.equal(first.ok, true, JSON.stringify(first.checks));
  assert.deepEqual(statusOf(first), {
    executable: "ok",
    "git-hooks": "ok",
    "git-identity": "ok",
    "managed-files": "ok",
    manifest: "ok",
    plan: "ok",
    "quality-drift": "ok",
    runtime: "ok",
    transaction: "ok",
  });

  // Breakage the doctor can fix: modes, sections, hooks path.
  chmodSync(path.join(root, "scripts", "workflow"), 0o644);
  const gitignore = path.join(root, ".gitignore");
  writeFileSync(
    gitignore,
    readFileSync(gitignore, "utf8").replace(".harness/workflow/local/\n", "")
  );
  const prePush = path.join(root, ".harness", "workflow", "hooks", "pre-push");
  writeFileSync(prePush, "#!/bin/sh\nexit 0\n");
  git.git.run(root, ["config", "--unset", "core.hooksPath"]);
  const broken = installer.doctor(root, { env, probe: healthy });
  assert.equal(broken.ok, false);
  assert.deepEqual(
    broken.checks
      .filter((item) => item.status === "fail")
      .map((item) => [item.id, item.fixable]),
    [
      ["managed-files", true],
      ["executable", true],
      ["git-hooks", true],
    ]
  );
  assert.equal(broken.fix, null);
  const planBefore = readFileSync(
    path.join(root, ".harness", "plans", "todo-plan.md"),
    "utf8"
  );
  const fixed = installer.doctor(root, {
    env,
    fix: { bundle, runtime },
    probe: healthy,
  });
  assert.equal(fixed.ok, true, JSON.stringify(fixed.checks));
  assert.deepEqual(fixed.fix.written.sort(), [
    ".gitignore",
    ".harness/workflow/hooks/pre-push",
  ]);
  // The fixed files equal the committed ones again, so nothing is committed.
  assert.equal(fixed.fix.commit, null);
  assert.deepEqual(git.changes(root).all, ["package.json"]);
  assert.equal(git.config(root, "core.hooksPath"), ".harness/workflow/hooks");
  assert.equal(
    readFileSync(path.join(root, ".harness", "plans", "todo-plan.md"), "utf8"),
    planBefore
  );

  // Findings the doctor reports but does not fix.
  const noRuntime = installer.doctor(root, {
    env,
    fix: { bundle, runtime: null },
    probe: () => null,
  });
  assert.equal(noRuntime.ok, false);
  assert.equal(noRuntime.fix, null);
  assert.deepEqual(
    noRuntime.checks.find((item) => item.id === "runtime").fixable,
    false
  );
  const configFile = path.join(root, ".harness", "workflow", "config.json");
  const config = JSON.parse(readFileSync(configFile, "utf8"));
  config.quality = {
    ...config.quality,
    stacks: ["python"],
    status: "CONFIGURED",
  };
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  const drift = installer.doctor(root, { env, probe: healthy });
  assert.equal(drift.ok, true);
  assert.equal(statusOf(drift)["quality-drift"], "warn");
  git.git.run(root, ["checkout", "--", ".harness/workflow/config.json"]);
  writeFileSync(
    path.join(root, ".harness", "workflow", "local", "transaction.json"),
    JSON.stringify({ id: "tx", phase: "FAILED" })
  );
  assert.equal(
    statusOf(installer.doctor(root, { env, probe: healthy })).transaction,
    "fail"
  );
  rmSync(path.join(root, ".harness", "workflow", "local", "transaction.json"));
  rmSync(path.join(root, ".harness", "workflow", "manifest.json"));
  assert.equal(
    statusOf(installer.doctor(root, { env, probe: healthy })).manifest,
    "fail"
  );
} finally {
  rmSync(sandbox, { force: true, recursive: true });
  await build.cleanup();
}
