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

## Task Files (`git-task-files.ts`)

- `beginTask(root, {scopeId, taskId, iteration})` records every change that
  exists when the task starts, with content fingerprints, in
  `.harness/workflow/local/task-files/<hash>.json`. Kit state is not
  recorded.
- `selectTaskFiles(root, identity, explicit?)` returns
  `{selected, excluded, preexisting}`:
  - without `explicit`, every file changed since the snapshot is selected,
    except:
    - edits that existed before the task;
    - Kit state (`.harness/workflow/**`, `.harness/plans/**`,
      `.harness/runtime/**`);
    - private files (`.env*`, keys and certificates, SSH keys, `.npmrc`).
  - errors:
    - `TASK_FILES_UNKNOWN` — there is no snapshot;
    - `EXISTING_EDITS_CHANGED` — a file that had edits before the task
      changed again;
    - `MANAGED_FILE` — an explicit list names Kit state.
  - every other changed file is reported as `excluded`.

## Commit Transaction (`git-journal.ts`, `git-transaction.ts`)

`transactions.commit(root, request)` creates exactly one commit. The request
holds:
- `role`, `scopeId`, `taskId`, `iteration`;
- `message`, `files`;
- `planPath` and `planText`: the plan document after the operation;
- `checks` and `excluded`;
- an optional `prepare` stage.

Steps:

1. Refuses to start when:
   - another transaction is pending (`TRANSACTION_PENDING`);
   - the index holds files outside the operation (`FOREIGN_STAGED`).
2. Backs the index up to `.harness/workflow/local/index-before` and writes
   the journal (`transaction.json`) with the original and candidate plan.
3. Runs `prepare(files)`: formatters may rewrite files here.
4. Writes the candidate plan, stages the files (deletions included) and
   records the candidate tree. If nothing is staged, it rolls back and
   fails with `NOTHING_TO_COMMIT`.
5. Runs `git commit -F -`. The message ends with trailers:
   - `Workflow-Scope`, `Workflow-Task`, `Workflow-Role`;
   - `Workflow-Iteration` (implementation only);
   - `Workflow-Transaction`.
6. On a non-zero exit (hook checks), restores the original plan and index,
   keeps working-tree edits, saves the failed journal under
   `verification/failed-<id>.json` and throws `COMMIT_FAILED` with
   `retryable: true`. If HEAD, plan or index changed concurrently, the
   journal is kept for repair.
7. On success, confirms the commit: the trailer transaction id, the single
   parent equal to the previous HEAD, and the tree equal to the candidate.
   Then it moves `verification/pending-<id>.json` to
   `verification/<sha>.json` and `last.json`, writes `last-commit.json` and
   removes the journal.

Other transaction calls:
- `transactions.journal(root)` returns the pending journal.
- `transactions.confirmed(root, journal)` returns the SHA of the commit the
  journal produced, if it exists.
- `transactions.finish(root)` completes the bookkeeping of a confirmed
  commit.
- `transactions.cancel(root)` rolls back an unconfirmed preparation.

## Owned Paths

- `module.md`
- `src/**`
