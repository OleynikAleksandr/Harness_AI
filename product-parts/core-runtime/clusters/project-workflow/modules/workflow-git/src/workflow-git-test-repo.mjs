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
