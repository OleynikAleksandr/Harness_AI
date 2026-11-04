# Workflow Integration Module

## Responsibility

Integration of executor results into main (section 7 of
`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`). For now it
owns the proof of an executor source: before main accepts a source commit,
the Kit proves its history, its diff, its check receipt and the task
contract. The merge, the integration journal and `integration:start` /
`integration:continue` come later in this module. The verification of
two-parent integration commits in main history belongs to `workflow-git`.

## Public Facade

`WorkflowIntegrationFacade` (class, singleton `workflowIntegrationFacade`)
in `src/workflow-integration-facade.ts`. The constructor takes a
`WorkflowGitFacade` (tests pass one without the hook `GIT_*` variables).
Types: `IntegrationProof`, `ProvenCheck`.

## Contract

`proveSource(mainRoot, assignment, sourceSha)` (`src/integration-proof.ts`)
takes the main checkout, the main assignment record and the reported SHA
(full or abbreviated) and returns
`{assignmentId, taskId, baseCommit, sourceCommit, sourceTree, changedFiles,
checks}`, or throws the first failure, in this order:
1. Source:
   - `INTEGRATION_NOT_READY` — the record is not `READY_FOR_INTEGRATION`,
     or has no worktree or source commit;
   - `INTEGRATION_SOURCE` — the SHA does not resolve to the record's
     `sourceCommit`, or the executor worktree HEAD is not that commit;
   - `INTEGRATION_DIRTY` (`details.paths`) — the executor worktree has
     uncommitted changes (ignored local state does not count).
2. `INTEGRATION_CONTRACT` — the plan of the base commit is missing or has no
   task of the record.
3. `INTEGRATION_HISTORY` — `git log base..source` (all parents) is not
   exactly a chain from the base:
   - first the `assignment-plan` commit that changes only the plan file;
   - then one or more task commits: role `implementation` (`docs` for a
     DOCS task, the role its executor commit has);
   - every commit has one parent, the previous commit (the base for the
     first one), and single trailers `Workflow-Scope: assignment-<id>`,
     `Workflow-Task: <task>`, `Workflow-Assignment: <id>` and
     `Workflow-Iteration: <record iteration>`;
   - the last commit is the source.
   Details: `sha` and `mismatches` (`{field, actual, expected}`), or the
   `commits` of a wrong-length chain, or the `paths` of the plan commit.
4. `INTEGRATION_HISTORY` (`details.paths`) — the diff `base..source` holds
   Kit-managed files (`.harness/workflow/**`, `.harness/plans/**`,
   `.harness/runtime/**`) or launchers (`scripts/workflow`,
   `scripts/workflow.cmd`, `scripts/workflow.ps1`), except the plan file.
5. `INTEGRATION_UNCHECKED` — the check receipt of the last task commit,
   `<worktree>/.harness/workflow/local/verification/<sha>.json` (written by
   the commit transaction of `workflow-git`):
   - is missing or unreadable;
   - does not name that commit (`commit`) and its transaction (`transaction`
     equal to the `Workflow-Transaction` trailer). The transaction confirmed
     that the commit tree is the checked candidate tree, so the receipt
     refers to the source tree;
   - has a result other than `passed` or `skipped`;
   - lacks a commit-stage check the hook runs for this commit (the
     `selectChecks` of the worktree configuration with the task's checks;
     the service selection for a DOCS task), or an assigned check
     (`task.checks`) did not pass (`details.checks`).
6. `INTEGRATION_CONTRACT` — main's current plan has another scope, no such
   task, or a task whose `files`, `acceptance`, `kind` or `title` differ from
   the base plan.

`sourceTree` is the tree of the source commit, `changedFiles` the sorted
diff `base..source` (the plan file included) and `checks` every result of
the receipt as `{id, stage, status}`. The proof never writes.

## Dependencies

`workflow-git` (history, diff paths, changes, `show`, the Kit-managed path
rule, the git runner), `workflow-plan` (`PLAN_PATH`, parse, read, types),
`workflow-quality` (receipt, configuration, check selection),
`workflow-assignment` (the record type), `workflow-platform` (errors).
Node built-ins only.

## Tests

`src/workflow-integration-facade.test.mjs` — a real temporary repository
with real hooks and an executor worktree (orchestrated scope, QUALITY,
`assignment:create`, `assignment:attach`, `task:start`, `commit --task`):
- the proof of the reported source (abbreviated SHA) with its tree,
  changed files and passed checks;
- `INTEGRATION_NOT_READY`, `INTEGRATION_SOURCE`, `INTEGRATION_DIRTY`;
- `INTEGRATION_HISTORY` for a foreign commit and for Kit files and a
  launcher in the diff;
- `INTEGRATION_UNCHECKED` for a missing receipt, a receipt of another
  commit, a failed check and missing checks, then a proof of two task
  commits once the receipt passes;
- `INTEGRATION_CONTRACT` after the task changed in main;
- main history (`resolveReferences` of `workflow-git`): hand-made merges of
  the source are refused without the role, with a wrong `Workflow-Source`,
  without `Workflow-Assignment` (`HISTORY_NOT_LINEAR`) and with a file
  outside the task (`COMMIT_SCOPE_MISMATCH`); a correct integration commit
  is the task's commit with the diff against its first parent.

## Owned Paths

- `module.md`
- `src/**`
