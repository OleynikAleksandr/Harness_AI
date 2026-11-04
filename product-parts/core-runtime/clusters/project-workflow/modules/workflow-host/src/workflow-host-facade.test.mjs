import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build as viteBuild } from "vite";
import {
  cleanGitEnvironment,
  identityTemplate,
} from "../../workflow-git/src/workflow-git-test-repo.mjs";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";

const build = await buildWorkflowModules(["workflow-host"], "workflow-host");
const sandbox = mkdtempSync(path.join(tmpdir(), "workflow-host-"));
try {
  const { WorkflowHostFacade } = await build.load(
    "workflow-host",
    "workflow-host-facade.js"
  );
  const node = { electron: false, execPath: process.execPath };

  // A fake bundle that echoes its arguments and environment as an envelope.
  const echo = path.join(sandbox, "echo", "workflow.mjs");
  mkdirSync(path.dirname(echo), { recursive: true });
  writeFileSync(
    echo,
    `const args = process.argv.slice(2);
if (args[0] === "fail") { process.stdout.write(JSON.stringify({ ok: false, code: "SCOPE_BLOCKED", message: "blocked", nextAction: "unblock", details: { a: 1 } })); process.exit(1); }
if (args[0] === "noise") { process.stderr.write("boom"); process.stdout.write("not json"); process.exit(2); }
if (args[0] === "sleep") { setTimeout(() => {}, 10000); }
else process.stdout.write(JSON.stringify({ command: args[0], ok: true, result: { args, cwd: process.cwd(), electron: process.env.ELECTRON_RUN_AS_NODE ?? null, gitDir: process.env.GIT_DIR ?? null } }));
`
  );

  // Bundle and runtime resolution.
  const project = path.join(sandbox, "project");
  mkdirSync(path.join(project, ".harness", "workflow", "runtime"), {
    recursive: true,
  });
  const installed = path.join(
    project,
    ".harness",
    "workflow",
    "runtime",
    "workflow.mjs"
  );
  writeFileSync(installed, readFileSync(echo, "utf8"));
  const byDirectory = new WorkflowHostFacade({
    current: node,
    env: { HARNESS_WORKFLOW_KIT_BUNDLE: path.dirname(echo) },
  });
  assert.deepEqual(byDirectory.bundle(null), { file: echo, source: "app" });
  assert.deepEqual(byDirectory.bundle(project), {
    file: installed,
    source: "project",
  });
  assert.deepEqual(byDirectory.bundle(project, true), {
    file: echo,
    source: "app",
  });
  assert.deepEqual(byDirectory.runtime(), {
    executable: process.execPath,
    mode: "node",
  });
  const byFile = new WorkflowHostFacade({
    current: node,
    env: {
      HARNESS_ELECTRON_NODE: "/apps/Harness",
      HARNESS_WORKFLOW_KIT_BUNDLE: echo,
    },
  });
  assert.equal(byFile.bundle(sandbox)?.file, echo);
  assert.deepEqual(byFile.runtime(), {
    executable: "/apps/Harness",
    mode: "electron",
  });
  const missing = new WorkflowHostFacade({
    current: node,
    env: { HARNESS_WORKFLOW_KIT_BUNDLE: path.join(sandbox, "none") },
  });
  assert.equal(missing.bundle(sandbox), null);
  const noBundle = await missing.status(sandbox);
  assert.equal(noBundle.ok, false);
  assert.equal(noBundle.code, "HOST_NO_BUNDLE");

  // Command protocol: arguments, environment, envelopes and failures.
  const host = new WorkflowHostFacade({
    current: { electron: true, execPath: process.execPath },
    env: {
      ...process.env,
      GIT_DIR: "/elsewhere/.git",
      HARNESS_WORKFLOW_KIT_BUNDLE: echo,
    },
    timeoutMs: 400,
  });
  const echoed = await host.status(sandbox);
  assert.equal(echoed.ok, true);
  assert.deepEqual(echoed.result.args, [
    "status",
    "--root",
    sandbox,
    "--format",
    "json",
  ]);
  assert.equal(echoed.result.electron, "1");
  assert.equal(echoed.result.gitDir, null);
  const failed = await host.run(["fail"]);
  assert.deepEqual(failed, {
    code: "SCOPE_BLOCKED",
    details: { a: 1 },
    message: "blocked",
    nextAction: "unblock",
    ok: false,
  });
  const noise = await host.run(["noise"]);
  assert.equal(noise.code, "HOST_OUTPUT");
  assert.equal(noise.details.stderr, "boom");
  const slow = await host.run(["sleep"]);
  assert.equal(slow.code, "HOST_TIMEOUT");
  const broken = new WorkflowHostFacade({
    env: {
      HARNESS_ELECTRON_NODE: path.join(sandbox, "no-runtime"),
      HARNESS_WORKFLOW_KIT_BUNDLE: echo,
    },
  });
  assert.equal((await broken.run(["status"])).code, "HOST_SPAWN");
  const fresh = path.join(sandbox, "not", "yet");
  const inspected = await host.inspect(fresh);
  assert.deepEqual(inspected.result.args.slice(0, 2), ["inspect", fresh]);
  assert.equal(realpathSync(inspected.result.cwd), realpathSync(sandbox));

  // End to end with the real bundle: inspect, install, status, doctor and
  // the runtime file.
  // The real single-file bundle, because install copies the running file.
  const bundle = path.join(sandbox, "kit", "workflow.mjs");
  await viteBuild({
    build: { outDir: path.dirname(bundle) },
    configFile: path.resolve("vite.workflow-kit.config.ts"),
    logLevel: "silent",
  });
  const identity = path.join(sandbox, "gitconfig");
  writeFileSync(
    identity,
    "[user]\n\tname = Workflow Test\n\temail = workflow@harness-ai.test\n"
  );
  const kitHost = new WorkflowHostFacade({
    current: node,
    env: {
      ...cleanGitEnvironment(),
      GIT_CONFIG_GLOBAL: identity,
      GIT_TEMPLATE_DIR: identityTemplate(sandbox),
      HARNESS_WORKFLOW_KIT_BUNDLE: bundle,
    },
  });
  // The parent folder exists: the New Project dialog picks it.
  const target = path.join(sandbox, "demo");
  const before = await kitHost.inspect(target);
  assert.equal(before.ok, true, JSON.stringify(before));
  const install = await kitHost.install(target, { name: "Demo" });
  assert.equal(install.ok, true, JSON.stringify(install));
  assert.ok(install.result.commit);
  assert.equal(kitHost.bundle(target)?.source, "project");
  const status = await kitHost.status(target);
  assert.equal(status.ok, true, JSON.stringify(status));
  assert.equal(status.result.installed, true);
  const doctor = await kitHost.doctor(target);
  assert.equal(doctor.ok, true, JSON.stringify(doctor));
  assert.equal(doctor.result.ok, true, JSON.stringify(doctor.result));
  const notInstalled = await kitHost.validate(sandbox);
  assert.equal(notInstalled.ok, true);
  assert.equal(notInstalled.result.ok, false);

  const electronHost = new WorkflowHostFacade({
    current: node,
    env: {
      HARNESS_ELECTRON_NODE: "/Applications/Harness AI.app/MacOS/Harness AI",
    },
  });
  assert.equal(electronHost.writeRuntimeFile(sandbox), false);
  assert.equal(electronHost.writeRuntimeFile(target), true);
  assert.equal(
    readFileSync(
      path.join(target, ".harness", "workflow", "local", "runtime"),
      "utf8"
    ),
    "/Applications/Harness AI.app/MacOS/Harness AI\nelectron\n"
  );
} finally {
  rmSync(sandbox, { force: true, recursive: true });
  await build.cleanup();
}
