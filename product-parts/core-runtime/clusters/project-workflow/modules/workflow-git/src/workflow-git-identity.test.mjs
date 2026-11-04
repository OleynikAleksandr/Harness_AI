import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildWorkflowModules } from "../../workflow-platform/src/workflow-test-build.mjs";
import { cleanGitEnvironment } from "./workflow-git-test-repo.mjs";

const build = await buildWorkflowModules(
  ["workflow-platform", "workflow-git"],
  "workflow-git-identity"
);
const sandbox = mkdtempSync(path.join(tmpdir(), "workflow-git-identity-"));
const PLAN = ".harness/plans/todo-plan.md";
const GLOBAL = { email: "global@harness-ai.test", name: "Global Person" };
const LOCAL = { email: "local@harness-ai.test", name: "Local Person" };
try {
  const { WorkflowGitFacade } = await build.load(
    "workflow-git",
    "workflow-git-facade.js"
  );
  const home = path.join(sandbox, "home");
  mkdirSync(home);
  const globalConfig = path.join(sandbox, "gitconfig");
  const setGlobal = (identity) =>
    writeFileSync(
      globalConfig,
      identity
        ? `[user]\n\tname = ${identity.name}\n\temail = ${identity.email}\n`
        : ""
    );
  setGlobal(GLOBAL);
  // An ambient command-scope identity overrides every config file unless the
  // commit passes `-c` explicitly.
  const env = {
    ...cleanGitEnvironment(),
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_KEY_0: "user.name",
    GIT_CONFIG_KEY_1: "user.email",
    GIT_CONFIG_VALUE_0: "Ambient Agent",
    GIT_CONFIG_VALUE_1: "agent@harness-ai.test",
    HOME: home,
    XDG_CONFIG_HOME: home,
  };
  const git = new WorkflowGitFacade(undefined, env);
  const code = (action) => {
    try {
      action();
    } catch (error) {
      return error.code;
    }
    return "OK";
  };

  // Placeholders are refused.
  const placeholder = (name, email) =>
    git.isPlaceholderIdentity({ email, name });
  for (const [name, email] of [
    ["", "real@harness-ai.test"],
    ["Real Person", ""],
    ["  ", "real@harness-ai.test"],
    ["Your Name", "real@harness-ai.test"],
    [" your name ", "real@harness-ai.test"],
    ["Ваше Имя", "real@harness-ai.test"],
    ["ВАШЕ ИМЯ", "real@harness-ai.test"],
    ["Real Person", "you@example.com"],
    ["Real Person", " YOU@EXAMPLE.COM "],
    ["Real Person", "me@example.org"],
    ["Real Person", "me@example.co.uk"],
    ["Real Person", "me@example"],
    ["Real Person", "me@invalid"],
    ["Real Person", "me@host.invalid"],
    ["Real Person", "me@localhost"],
    ["Real Person", "no-at-sign"],
  ]) {
    assert.equal(placeholder(name, email), true, `${name} <${email}>`);
  }
  assert.equal(placeholder("Real Person", "me@harness-ai.dev"), false);
  assert.equal(placeholder("Real Person", "me@notexample.com"), false);

  // Local and global identities are read separately.
  const root = path.join(sandbox, "repo");
  mkdirSync(root);
  git.init(root);
  assert.equal(git.readIdentity(root, "local"), null);
  assert.deepEqual(git.readIdentity(root, "global"), GLOBAL);

  // Resolve order: local, else global; placeholders are skipped.
  assert.deepEqual(git.resolveIdentity(root), { ...GLOBAL, source: "global" });
  git.setConfig(root, "user.name", "Your Name");
  git.setConfig(root, "user.email", "you@example.com");
  assert.deepEqual(git.readIdentity(root, "local"), {
    email: "you@example.com",
    name: "Your Name",
  });
  assert.deepEqual(git.resolveIdentity(root), { ...GLOBAL, source: "global" });
  setGlobal({ email: "me@example.com", name: "Ваше Имя" });
  assert.equal(git.resolveIdentity(root), null);

  // Kit commits refuse a placeholder or missing local identity before writing.
  const commit = () =>
    git.transactions.commit(root, {
      files: ["a.txt"],
      message: "chore: identity",
      planPath: PLAN,
      planText: "plan\n",
      role: "bootstrap",
      scopeId: null,
      taskId: null,
    });
  writeFileSync(path.join(root, "a.txt"), "a\n");
  let failure = null;
  try {
    commit();
  } catch (error) {
    failure = error;
  }
  assert.equal(failure?.code, "GIT_IDENTITY_REQUIRED");
  assert.match(failure.message, /placeholder/u);
  assert.ok(
    failure.message.includes('git config --global user.name "Your Real Name"')
  );
  assert.ok(
    failure.message.includes('git config --global user.email "you@your-domain"')
  );
  assert.ok(failure.message.includes("scripts/workflow doctor --fix"));
  assert.equal(existsSync(path.join(root, PLAN)), false);
  assert.equal(existsSync(git.localPath(root)), false);
  assert.equal(git.transactions.journal(root), null);

  // Without any local identity the commit is refused even with a real global one.
  git.git.run(root, ["config", "--local", "--unset", "user.name"]);
  git.git.run(root, ["config", "--local", "--unset", "user.email"]);
  setGlobal(GLOBAL);
  assert.equal(code(commit), "GIT_IDENTITY_REQUIRED");
  assert.equal(existsSync(path.join(root, PLAN)), false);
  assert.equal(git.head(root), null);

  // writeLocalIdentity refuses placeholders and stores a real identity.
  assert.equal(
    code(() =>
      git.writeLocalIdentity(root, { email: "x@example.net", name: "Real" })
    ),
    "GIT_IDENTITY_PLACEHOLDER"
  );
  assert.equal(git.readIdentity(root, "local"), null);
  git.writeLocalIdentity(root, { email: ` ${LOCAL.email}`, name: LOCAL.name });
  assert.deepEqual(git.readIdentity(root, "local"), LOCAL);
  assert.deepEqual(git.resolveIdentity(root), { ...LOCAL, source: "local" });

  // The commit is signed with the local identity, not the ambient or global one.
  const result = commit();
  const signature = git.git.text(root, [
    "log",
    "-1",
    "--format=%an <%ae>|%cn <%ce>",
    result.sha,
  ]);
  const expected = `${LOCAL.name} <${LOCAL.email}>`;
  assert.equal(signature, `${expected}|${expected}`);
  // A plain git command would have used the ambient identity.
  assert.deepEqual(git.identity(root), {
    email: "agent@harness-ai.test",
    name: "Ambient Agent",
  });
  console.log("workflow-git identity tests passed");
} finally {
  rmSync(sandbox, { force: true, recursive: true });
  await build.cleanup();
}
