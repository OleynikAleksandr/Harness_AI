import assert from "node:assert/strict";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
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
  "workflow-installer-install"
);
const sandbox = mkdtempSync(path.join(tmpdir(), "workflow-install-"));
const at = (...parts) => path.join(sandbox, ...parts);
const write = (target, text) => {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
};
try {
  const { WorkflowGitFacade } = await build.load(
    "workflow-git",
    "workflow-git-facade.js"
  );
  const { WorkflowInstallerFacade } = await build.load(
    "workflow-installer",
    "workflow-installer-facade.js"
  );
  const { WorkflowKitFacade } = await build.load(
    "workflow-kit",
    "workflow-kit-facade.js"
  );
  const identity = at("gitconfig");
  writeFileSync(
    identity,
    "[user]\n\tname = Workflow Test\n\temail = workflow@example.invalid\n"
  );
  writeFileSync(at("empty-gitconfig"), "");
  const env = { ...cleanGitEnvironment(), GIT_CONFIG_GLOBAL: identity };
  const git = new WorkflowGitFacade(undefined, env);
  const installer = new WorkflowInstallerFacade(git);
  const kit = new WorkflowKitFacade({ env, git });
  // The installed launcher runs this stand-in bundle, which drives the compiled CLI.
  const bundle = `import { readFileSync } from "node:fs";
import { runCli } from ${JSON.stringify(path.join(build.directory, "workflow-kit", "src", "workflow-kit-cli.js"))};
process.exitCode = runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  readStdin: () => { try { return readFileSync(0, "utf8"); } catch { return ""; } },
  stderr: (text) => process.stderr.write(text),
  stdout: (text) => process.stdout.write(text),
});
`;
  const options = {
    bundle,
    runtime: { executable: process.execPath, mode: "node" },
  };
  const code = (action) => {
    try {
      action();
    } catch (error) {
      return error.code;
    }
    return "OK";
  };

  // New project: missing folder, no identity → nothing is written.
  const fresh = at("fresh");
  assert.equal(installer.inspect(fresh).state, "MISSING");
  assert.equal(installer.inspect(fresh).action, "create");
  const anonymous = new WorkflowInstallerFacade(
    new WorkflowGitFacade(undefined, {
      ...env,
      GIT_CONFIG_GLOBAL: at("empty-gitconfig"),
    })
  );
  assert.equal(
    code(() => anonymous.install(fresh, options)),
    "GIT_IDENTITY"
  );
  assert.equal(existsSync(fresh), false);

  const installed = installer.install(fresh, { ...options, name: "Fresh App" });
  assert.equal(installed.previousState, "MISSING");
  assert.equal(installed.hooksPath, ".harness/workflow/hooks");
  assert.equal(git.config(fresh, "core.hooksPath"), ".harness/workflow/hooks");
  accessSync(path.join(fresh, "scripts", "workflow"), constants.X_OK);
  accessSync(
    path.join(fresh, ".harness", "workflow", "hooks", "pre-commit"),
    constants.X_OK
  );
  assert.match(
    readFileSync(path.join(fresh, "README.md"), "utf8"),
    /^# Fresh App\n/u
  );
  const [bootstrap] = git.history(fresh, null);
  assert.equal(bootstrap.trailers["Workflow-Role"][0], "bootstrap");
  assert.equal(installer.inspect(fresh).state, "KIT_OK");
  const status = kit.status(fresh);
  assert.equal(status.installed, true);
  assert.deepEqual(status.project, { id: "fresh-app", name: "Fresh App" });
  assert.deepEqual(status.changes, []);
  assert.equal(
    code(() => installer.install(fresh, options)),
    "ALREADY_INSTALLED"
  );

  // The installed hooks reject a direct commit through the real launcher.
  write(path.join(fresh, "direct.txt"), "x");
  git.git.run(fresh, ["add", "direct.txt"]);
  const direct = git.git.run(fresh, ["commit", "-q", "-m", "direct"], {
    allowFailure: true,
  });
  assert.notEqual(direct.status, 0);
  assert.match(direct.stderr, /MANAGED_COMMIT_REQUIRED/u);
  git.git.run(fresh, ["reset", "-q"]);
  rmSync(path.join(fresh, "direct.txt"));

  // Damage is detected and repaired by an update; an unchanged update commits nothing.
  const agents = path.join(fresh, "AGENTS.md");
  writeFileSync(
    agents,
    readFileSync(agents, "utf8").replace(
      "Never commit with",
      "Feel free to commit with"
    )
  );
  const damaged = installer.inspect(fresh);
  assert.deepEqual(
    [damaged.state, damaged.action, damaged.damaged],
    ["KIT_DAMAGED", "doctor", ["AGENTS.md"]]
  );
  const repaired = installer.install(fresh, { ...options, update: true });
  assert.deepEqual(repaired.written, ["AGENTS.md"]);
  assert.equal(repaired.commit, null);
  assert.equal(installer.inspect(fresh).state, "KIT_OK");

  // An older manifest version is outdated; the update commits with kit-update.
  const manifestFile = path.join(
    fresh,
    ".harness",
    "workflow",
    "manifest.json"
  );
  writeFileSync(
    manifestFile,
    readFileSync(manifestFile, "utf8").replace(
      '"version": "2.0.0"',
      '"version": "1.9.0"'
    )
  );
  git.git.run(fresh, ["add", ".harness/workflow/manifest.json"]);
  git.git.run(fresh, [
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "-q",
    "-m",
    "test: pretend an old kit",
  ]);
  assert.deepEqual(
    [
      installer.inspect(fresh).state,
      installer.inspect(fresh).action,
      installer.inspect(fresh).version,
    ],
    ["KIT_OUTDATED", "update", "1.9.0"]
  );
  const updated = installer.install(fresh, { ...options, update: true });
  assert.deepEqual(updated.written, [".harness/workflow/manifest.json"]);
  assert.equal(
    git.history(fresh, null).at(-1).trailers["Workflow-Role"][0],
    "kit-update"
  );
  assert.equal(installer.inspect(fresh).state, "KIT_OK");

  // Existing files without git: kept as they are and left out of the commit.
  const existing = at("existing");
  write(path.join(existing, "README.md"), "# Mine\n");
  write(path.join(existing, "src", "main.ts"), "export {};\n");
  assert.equal(installer.inspect(existing).state, "NOT_GIT");
  const adopted = installer.install(existing, options);
  assert.equal(
    readFileSync(path.join(existing, "README.md"), "utf8"),
    "# Mine\n"
  );
  assert.deepEqual(adopted.excluded, ["README.md", "src/main.ts"]);
  assert.equal(installer.inspect(existing).state, "KIT_OK");

  // A configured hooks path (husky) gets managed sections after the shebang.
  const husky = at("husky");
  mkdirSync(husky);
  git.init(husky);
  git.setConfig(husky, "core.hooksPath", ".husky");
  write(
    path.join(husky, ".husky", "pre-commit"),
    "#!/usr/bin/env sh\necho husky\n"
  );
  write(path.join(husky, "package.json"), "{}\n");
  assert.equal(installer.inspect(husky).state, "GIT_NO_KIT");
  assert.deepEqual(installer.inspect(husky).stacks, ["node"]);
  const huskyInstall = installer.install(husky, options);
  assert.equal(huskyInstall.hooksPath, ".husky");
  assert.equal(git.config(husky, "core.hooksPath"), ".husky");
  assert.match(
    readFileSync(path.join(husky, ".husky", "pre-commit"), "utf8"),
    /^#!\/usr\/bin\/env sh\n# workflow-kit:begin\n.*git-hook pre-commit.*\n# workflow-kit:end\necho husky\n$/u
  );
  assert.equal(
    existsSync(path.join(husky, ".harness", "workflow", "hooks")),
    false
  );

  // A legacy Harness plan is detected and kept for migration.
  const legacy = at("legacy");
  mkdirSync(legacy);
  git.init(legacy);
  const legacyPlan =
    "# Plan\n\nSchema: harness-ai-plan-v1\nExecution Scope Status: NONE\n";
  write(path.join(legacy, ".harness", "plans", "todo-plan.md"), legacyPlan);
  git.git.run(legacy, ["add", "-A"]);
  git.git.run(legacy, ["commit", "-q", "-m", "legacy"]);
  assert.deepEqual(
    [installer.inspect(legacy).state, installer.inspect(legacy).action],
    ["LEGACY_HARNESS_PLAN", "install-migrate"]
  );
  const legacyInstall = installer.install(legacy, options);
  assert.equal(legacyInstall.migrationRequired, true);
  assert.equal(
    readFileSync(
      path.join(legacy, ".harness", "plans", "todo-plan.md"),
      "utf8"
    ),
    legacyPlan
  );

  // Workflow Pilot projects and nested folders are refused.
  const pilot = at("pilot");
  write(path.join(pilot, ".harness", "kit-manifest.json"), "{}");
  assert.deepEqual(
    [installer.inspect(pilot).state, installer.inspect(pilot).action],
    ["PILOT_KIT", "unsupported"]
  );
  assert.equal(
    code(() => installer.install(pilot, options)),
    "PILOT_KIT_UNSUPPORTED"
  );
  mkdirSync(path.join(fresh, "nested"));
  assert.equal(
    installer.inspect(path.join(fresh, "nested")).action,
    "unsupported"
  );
  assert.equal(
    code(() => installer.install(path.join(fresh, "nested"), options)),
    "NESTED_REPOSITORY"
  );
  assert.equal(installer.inspect(at("empty-dir-missing")).state, "MISSING");
  mkdirSync(at("empty"));
  assert.deepEqual(
    [
      installer.inspect(at("empty")).state,
      installer.inspect(at("empty")).action,
    ],
    ["EMPTY", "install"]
  );
} finally {
  rmSync(sandbox, { force: true, recursive: true });
  await build.cleanup();
}
