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
of this repository. Test repositories set a real local identity;
repositories that git creates during a test (for example
through install) get it from `identityTemplate(folder)`, passed as
`GIT_TEMPLATE_DIR`.

## Contract

- `git.run(root, args, {allowFailure, input, timeoutMs})` runs git without a
  shell. Errors:
  - `GIT_UNAVAILABLE` — git did not start;
  - `GIT_FAILED` — non-zero exit, unless `allowFailure` is set.
- `isRepository`, `topLevel`, `init(root, "main")`.
- `head(root)` returns the full SHA, or `null` before the first commit.
- `identity(root)` returns the effective `{name, email}` (every config
  scope git reads), or `null`.
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

## Git Identity (`git-identity.ts`)

- `readIdentity(root, scope)` reads `user.name` and `user.email` from one
  config file only: `"local"` (`git config --local`, the repository config
  shared by all its worktrees) or `"global"` (`git config --global`).
  Returns `null` unless both values are set.
- `isPlaceholderIdentity({name, email})` is true when, after trimming and
  ignoring case:
  - the name or the email is empty;
  - the name is `Your Name` or `Ваше Имя`;
  - the email is `you@example.com` or has no `@`;
  - the email domain is `example`, `example.<anything>`, `invalid`,
    `*.invalid` or `localhost`.
- `resolveIdentity(root)` returns the local identity, else the global one,
  skipping placeholders, as `{name, email, source: "local" | "global"}`, or
  `null`.
- `writeLocalIdentity(root, identity)` writes the trimmed identity to the
  repository-local config; a placeholder fails with
  `GIT_IDENTITY_PLACEHOLDER` and nothing is written.

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

1. Refuses to start, before anything is written, when:
   - another transaction is pending (`TRANSACTION_PENDING`);
   - the index holds files outside the operation (`FOREIGN_STAGED`);
   - the repository-local identity is missing or a placeholder
     (`GIT_IDENTITY_REQUIRED`). The global identity is never used here. The
     message and the next action name the one-time fix:
     `git config --global user.name "Your Real Name"`,
     `git config --global user.email "you@your-domain"`, then
     `scripts/workflow doctor --fix` applies it to the project.
2. Backs the index up to `.harness/workflow/local/index-before` and writes
   the journal (`transaction.json`) with the original and candidate plan.
3. Runs `prepare(files)`: formatters may rewrite files here.
4. Writes the candidate plan, stages the files (deletions included) and
   records the candidate tree. If nothing is staged, it rolls back and
   fails with `NOTHING_TO_COMMIT`.
5. Runs `git -c user.name=<local name> -c user.email=<local email> commit
   -F -` with `GIT_AUTHOR_NAME/EMAIL` and `GIT_COMMITTER_NAME/EMAIL` set to
   the same identity (`identityEnv`; Git exports `GIT_AUTHOR_*` to hooks and
   they win over `-c`), so the author and committer are the
   repository-local identity whatever the home directory, global config,
   `GIT_CONFIG_*` or `GIT_AUTHOR_*` variables of the caller say. The message ends with trailers:
   - `Workflow-Scope`, `Workflow-Task`, `Workflow-Role`;
   - `Workflow-Iteration` (every commit that completes a task);
   - `Workflow-Transaction`.
6. On a non-zero exit (hook checks), restores the original plan and index,
   keeps working-tree edits, saves the failed journal under
   `verification/failed-<id>.json`, removes the hook evidence
   `verification/pending-<id>.json` and throws `COMMIT_FAILED` with
   `retryable: true`. If HEAD, plan or index changed concurrently, the
   journal is kept for repair.
7. On success, confirms the commit: the trailer transaction id, the single
   parent equal to the previous HEAD, and the tree equal to the candidate.
   Then it copies `verification/pending-<id>.json` (with `commit: <sha>`) to
   `verification/<sha>.json` and `last.json`, removes the pending file,
   writes `last-commit.json` and removes the journal.
   Every rollback (failed checks, nothing to commit, repair retry or
   cancel) and every finished transaction (including `finish-commit`
   repair) removes the pending file, so none remains; it lives only while
   the journal of an unresolved transaction is kept.

Other transaction calls:
- `transactions.journal(root)` returns the pending journal.
- `transactions.confirmed(root, journal)` returns the SHA of the commit the
  journal produced, if it exists.
- `transactions.finish(root)` completes the bookkeeping of a confirmed
  commit.
- `transactions.cancel(root)` rolls back an unconfirmed preparation.

## Commit References (`git-references.ts`)

`resolveReferences(root, plan, planPath)` maps every task outside legacy
rounds to one of:
- `{status: "committed", sha, paths}`;
- `{status: "pending"}` — inside the current transaction;
- `{status: "open"}`.

It searches `baselineCommit..HEAD` for task commits (roles
`implementation`, `docs` for a round's DOCS task and `quality` for the
QUALITY task) whose `Workflow-Scope`, `Workflow-Task` and
`Workflow-Iteration` match the task.
Errors:
- `AMBIGUOUS_COMMIT` — several matching commits, or duplicated trailers;
- `PLAN_COMMIT_MISMATCH` — a `DONE` task without a commit, or a commit for a
  task that is not `DONE`;
- `HISTORY_NOT_LINEAR` — a task commit with more than one parent;
- `COMMIT_SCOPE_MISMATCH` — the commit touches files outside the task's
  files and the plan;
- `DEPENDENCY_ORDER` — a dependency commit is not an ancestor. Legacy-round
  dependencies are exempt.

## Repair (`git-repair.ts`)

`planRepair(root, planPath)` is a dry run. It returns `{kind, message,
repairId}`, where the id pins HEAD, the plan text and the journal. Kinds:
- `finish-commit` — a journal whose commit exists;
- `retry-commit` — a journal whose commit does not exist;
- `projection` — the readable plan differs from its JSON;
- `defer-docs` — the current `DOCS` task waits for added work;
- `none`.

`applyRepair(root, planPath, id)` performs the action. If the id no longer
matches, it fails with `REPAIR_CHANGED`. A retry rolls the preparation back
and repeats the same request with the same transaction id; it fails with
`REPAIR_MANUAL` when state changed concurrently. `cancelRepair` only
cancels an unconfirmed preparation (`NO_PREPARATION`) and keeps edits.

During rollback the index is restored from `index-before`. If the backup is
missing, it is restored from the previous HEAD tree, or emptied when there
was no commit yet.

## Owned Paths

- `module.md`
- `src/**`
