# Workflow Git Module

## Responsibility

All git work of the Workflow Kit:
- repository queries: repository, HEAD, identity, config, git paths;
- working-tree changes;
- commit history with `Workflow-*` trailers;
- the transactional task commit;
- resolving each task to its commit;
- repair.

## Public Facade

`WorkflowGitFacade` (class, singleton `workflowGitFacade`). The constructor
takes a platform facade and an environment. Tests pass an environment
without the `GIT_*` hook variables (`src/workflow-git-test-repo.mjs`), so
they work on temporary repositories even when they run inside a commit hook
of this repository.

## Contract

- `git.run(root, args, {allowFailure, input, timeoutMs})` runs git without a
  shell. Errors:
  - `GIT_UNAVAILABLE` — git did not start;
  - `GIT_FAILED` — non-zero exit, unless `allowFailure` is set.
- `isRepository`, `topLevel`, `init(root, "main")`.
- `head(root)` returns the full SHA, or `null` before the first commit.
- `identity(root)` returns `{name, email}`, or `null`.
- `changes(root)` returns `{staged, unstaged, untracked, all}`: sorted
  canonical paths from `git status --porcelain=v1 -z`. Renames and copies
  record both paths.
- `history(root, from, tip)` returns the commits in `from..tip`, oldest
  first: `{sha, parents, subject, message, trailers}`. Trailers are the
  `Workflow-*` lines of the last message paragraph.
- `commitPaths(root, sha)`, `isAncestor(root, a, b)`,
  `show(root, revision, path)` (`null` when the file is absent),
  `config`/`setConfig`, and `gitPath(root, name)` (absolute path inside the
  git directory).

## Owned Paths

- `module.md`
- `src/**`
