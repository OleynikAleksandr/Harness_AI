import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// Test support for the workflow-git and later project-workflow tests: an
// environment without the GIT_* variables that git sets for hooks, so tests
// that run inside a commit hook operate on their own temporary repositories.
const HOOK_VARIABLES = [
  "GIT_DIR",
  "GIT_INDEX_FILE",
  "GIT_WORK_TREE",
  "GIT_PREFIX",
  "GIT_EDITOR",
  "GIT_AUTHOR_DATE",
  "GIT_COMMITTER_DATE",
  "GIT_REFLOG_ACTION",
];

export function cleanGitEnvironment(base = process.env) {
  const env = { ...base, GIT_CONFIG_NOSYSTEM: "1" };
  for (const name of HOOK_VARIABLES) {
    delete env[name];
  }
  return env;
}

const TEST_IDENTITY = {
  email: "workflow@harness-ai.test",
  name: "Workflow Test",
};

// Kit commits sign with the repository-local identity only. Repositories that
// a test lets git create (for example through install) get that identity from
// this init template: pass the returned folder as GIT_TEMPLATE_DIR.
export function identityTemplate(folder, identity = TEST_IDENTITY) {
  const template = path.join(folder, "git-template");
  mkdirSync(template, { recursive: true });
  writeFileSync(
    path.join(template, "config"),
    `[user]\n\tname = ${identity.name}\n\temail = ${identity.email}\n`
  );
  return template;
}
