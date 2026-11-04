# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-04T08:51:22.970Z",
    "scopeId": "release-fixes-2026-11-04"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 37,
  "rounds": [
    {
      "digest": null,
      "id": "R1",
      "kind": "implementation",
      "status": "OPEN",
      "title": "Implementation"
    }
  ],
  "schema": "harness-workflow-plan/1",
  "scope": {
    "acceptance": [
      "scope:propose and the in-chat choice card create the scope in the chosen mode; without parallel work the card offers sequential or refine, and a repeated proposal without parallel work after refine becomes sequential automatically",
      "In orchestrated mode Claude subagent executors commit their task in their own worktree and the orchestrator integrates it into main with checks; independent tasks run in parallel",
      "Kit commits carry a real git identity taken from git config; placeholders are refused",
      "The sidebar shows the active plan with live progress under the agent card; a task row opens its executor session",
      "A new macOS package is built and verified"
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-04T09:09:24.635Z",
      "text": "User 2026-11-04: answers 1-7 ('Первое – да, согласен ... Седьмое. А зачем нам два релиза? Делаем один релиз обсужденный во всех предыдущих пунктах.') and the sidebar plan request ('будет карточка оркестратора ... и под ним to-do plan, со всеми пунктами, и динамика его выполнения')."
    },
    "baselineCommit": "3db98060386264e72ac9f21da6b6b444bbbf4e2a",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/architecture/workflow-kit/WorkflowKitProcess.md",
        "required": false
      },
      {
        "path": "docs/architecture/workflow-kit/WorkflowKit.md",
        "required": false
      },
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      }
    ],
    "decisions": [],
    "delivery": "IN_PROGRESS",
    "id": "execution-modes-2026-11-04",
    "objective": "Workflow Kit execution modes: the user picks sequential or orchestrated on a choice card when the plan is proposed; sequential is one agent, orchestrated runs every task by Claude subagent executors attached to their worktrees with checked commits and merge integration into main; Kit-formed git identity; the plan with live progress and executor sessions in the Harness sidebar; small Kit fixes; a new macOS release.",
    "spec": "docs/architecture/workflow-kit/WorkflowKitExecutionModes.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "parallelSafe defaults to false and true requires concrete paths (PARALLEL_FILES)",
        "hasParallelWork follows the compatibility rule of spec section 2",
        "execution {strategy, maxWorkers, ownerSession} round-trips through the plan document; absent means sequential"
      ],
      "checks": [],
      "commitMessage": "feat: add parallel labels and execution block to workflow plans",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-model.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-execution.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-document.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-service-tasks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-transitions.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-validation.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-execution.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts"
      ],
      "fixes": null,
      "id": "E1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Plan labels and execution block",
      "why": "Modes need parallelSafe labels, a scope execution block and a Kit-computed parallel-work fact"
    },
    {
      "acceptance": [
        "placeholders are refused (GIT_IDENTITY_PLACEHOLDER)",
        "every Kit commit passes the repo-local identity explicitly and fails with GIT_IDENTITY_REQUIRED and the git config command when none exists"
      ],
      "checks": [],
      "commitMessage": "feat: form and verify git identity in workflow commits",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-identity.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-runner.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-history.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-identity.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-repair.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-test-repo.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-doctor.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-migrate.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-hooks.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-lifecycle.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-project.test.mjs",
        "scripts/build-workflow-kit.mjs"
      ],
      "fixes": null,
      "id": "E2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Kit-formed git identity in transactions",
      "why": "Commits got a placeholder identity and agents with isolated homes cannot see the user's config"
    },
    {
      "acceptance": [
        "install copies a real identity from local or global config into the repo-local config",
        "install --host harness writes config.host",
        "managed .gitignore lists .harness/sessions/ and .claude/worktrees/",
        "doctor git-identity reports and fixes from global config without guessing"
      ],
      "checks": [],
      "commitMessage": "feat: install git identity and host marker",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E2"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts"
      ],
      "fixes": null,
      "id": "E3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Installer identity, host marker, gitignore and doctor",
      "why": "The installer runs with the real home and must write the identity to the repo; Harness projects need the host marker"
    },
    {
      "acceptance": [
        "scope:propose validates like scope:create, stores generation/digest/options and refuses orchestrated without parallel work (NO_PARALLEL_WORK)",
        "scope:choose creates the scope in the chosen mode or records refine; stale choices fail with PROPOSAL_CHANGED",
        "a repeated proposal without parallel work after refine creates a sequential scope with autoChosen",
        "scope:create in a harness-hosted project fails with EXECUTION_MODE_REQUIRED"
      ],
      "checks": [],
      "commitMessage": "feat: propose scopes and record the user's execution mode",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E1"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-execution-mode/src/workflow-execution-mode-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-execution.ts",
        ".harness/product-tree/product-tree.json"
      ],
      "fixes": null,
      "id": "E4",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Scope proposal and mode choice",
      "why": "The user chooses the mode on a card; Kit stores the proposal and creates the scope on the choice"
    },
    {
      "acceptance": [
        "assignment:next honours dependencies, maxWorkers, the barrier and path conflicts",
        "assignment:create checks the preconditions of spec 5.1 and returns the id and the executor brief",
        "records live under .harness/workflow/local/assignments and retries are idempotent"
      ],
      "checks": [],
      "commitMessage": "feat: schedule and create orchestrated assignments",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E4"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-schedule.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-records.ts",
        ".harness/product-tree/product-tree.json"
      ],
      "fixes": null,
      "id": "E5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Assignment records and scheduling",
      "why": "Kit decides which orchestrated tasks can be handed out now and issues the executor brief"
    },
    {
      "acceptance": [
        "assignment:attach verifies the linked worktree, base and clean tree and commits the assignment-plan",
        "commands outside the executor whitelist fail with ASSIGNMENT_READ_ONLY and contract edits are refused",
        "task:start of work/DOCS in orchestrated main fails with ORCHESTRATED_MAIN_READ_ONLY; delivery waits with DELIVERY_NOT_READY"
      ],
      "checks": [],
      "commitMessage": "feat: attach executors to their worktrees",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E5"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-attach.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-hooks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts"
      ],
      "fixes": null,
      "id": "E6",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Attach executors and guard their worktree",
      "why": "The executor binds the Claude worktree, gets a one-task plan and can only run its task"
    },
    {
      "acceptance": [
        "NEEDS_SETUP and assignment:setup run the stack prepare command without touching main node_modules",
        "assignment:cleanup removes the worktree and merged branch without force and keeps PENDING on refusal"
      ],
      "checks": [],
      "commitMessage": "feat: set up and clean executor worktrees",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E6"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-setup.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-cleanup.ts"
      ],
      "fixes": null,
      "id": "E7",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Executor worktree setup and cleanup",
      "why": "Worktrees need their own dependencies and must disappear after integration"
    },
    {
      "acceptance": [
        "proof rejects foreign commits, Kit files and unchecked trees (INTEGRATION_HISTORY, INTEGRATION_UNCHECKED)",
        "history verification accepts two-parent commits only with role integration and a proven source"
      ],
      "checks": [],
      "commitMessage": "feat: prove executor sources for integration",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E6"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-proof.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-history.ts",
        ".harness/product-tree/product-tree.json"
      ],
      "fixes": null,
      "id": "E8",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Integration proof and history",
      "why": "Main may accept only proven executor commits as two-parent integration commits"
    },
    {
      "acceptance": [
        "integration:start merges, builds the plan candidate, checks scope and commits with role integration",
        "CONFLICT and CHECKS_FAILED keep the merge state and integration:continue finishes",
        "retry after a crash completes the same commit without a second merge or reset"
      ],
      "checks": [],
      "commitMessage": "feat: integrate executor results into main",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E7",
        "E8"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-merge.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-journal.ts"
      ],
      "fixes": null,
      "id": "E9",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Merge integration with journal and continue",
      "why": "The orchestrator merges each executor result with checks on the merged tree and safe retry"
    },
    {
      "acceptance": [
        "recovery names the role and its next step in main and in an executor worktree",
        "the managed AGENTS section describes the four roles, helper subagents in sequential and the identity rule"
      ],
      "checks": [],
      "commitMessage": "feat: teach agents the execution roles",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E4",
        "E9"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-sections.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-roles.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-sections.ts"
      ],
      "fixes": null,
      "id": "E10",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Agent roles in recovery and AGENTS",
      "why": "Agents must follow the planning, self, orchestrator and executor roles"
    },
    {
      "acceptance": [
        "status lists plan tasks with parallelSafe, execution, assignments and scopeProposal",
        "the autopilot continues on READY_FOR_INTEGRATION and on ready tasks"
      ],
      "checks": [],
      "commitMessage": "feat: report orchestration in kit status and autopilot",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E9"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-status.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-decision.ts"
      ],
      "fixes": null,
      "id": "E11",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Kit status and autopilot for orchestration",
      "why": "Core needs tasks, execution, assignments and the proposal in status, and the autopilot must continue the orchestrator"
    },
    {
      "acceptance": [
        "no quality drift is reported for a project without package.json",
        "DOCS accepts .harness/product-tree/**",
        "pending verification files are removed",
        "inspect --format text prints text"
      ],
      "checks": [],
      "commitMessage": "fix: small workflow kit defects from test runs",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-apply.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-model.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-repair.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-text.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-lifecycle.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-validation.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-apply.test.mjs"
      ],
      "fixes": null,
      "id": "E12",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Small Kit fixes from test runs",
      "why": "Test projects 001 and 002 exposed false drift, a DOCS refusal, leftovers and JSON text output"
    },
    {
      "acceptance": [
        "two parallel executors, the barrier, a conflict, failed merged checks and crash retries pass on real worktrees"
      ],
      "checks": [],
      "commitMessage": "test: prove orchestrated execution on real worktrees",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E10",
        "E11",
        "E12"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario.test.mjs"
      ],
      "fixes": null,
      "id": "E13",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Orchestration scenario test on real worktrees",
      "why": "The whole route must be proven with real git worktrees"
    },
    {
      "acceptance": [
        "changes of the plan file or the Kit local state of a known workspace publish workflow:status",
        "watchers stop when the workspace is removed"
      ],
      "checks": [],
      "commitMessage": "feat: publish workflow status on plan changes",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E11"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-watch.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts"
      ],
      "fixes": null,
      "id": "E14",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Core watches the plan and publishes status",
      "why": "Plan progress must update without the renderer asking, also while executors work"
    },
    {
      "acceptance": [
        "subagent session metadata carries the working directory recorded in its transcript",
        "Core session records keep it"
      ],
      "checks": [],
      "commitMessage": "feat: report claude subagent working directory",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-files.ts",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-observer.ts",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts"
      ],
      "fixes": null,
      "id": "E15",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Claude subagent working directory",
      "why": "Core binds an executor session to its task by the subagent worktree"
    },
    {
      "acceptance": [
        "workflow:status carries planView: scope, progress, mode, task rows with label and executor sessionId",
        "the binding matches the subagent working directory with the assignment worktree"
      ],
      "checks": [],
      "commitMessage": "feat: build the plan view with executor sessions",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E14",
        "E15"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-plan-view.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts"
      ],
      "fixes": null,
      "id": "E16",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Core plan view with executor sessions",
      "why": "The sidebar shows the plan from a Core read model; the binding is Core truth"
    },
    {
      "acceptance": [
        "the card model offers orchestrated only to Claude sessions",
        "workflow-mode-choose calls scope:choose and sends the choice to the owner session as a user message",
        "a manual user message dismisses the card",
        "prepare-project installs with --host harness"
      ],
      "checks": [],
      "commitMessage": "feat: route the execution mode choice through core",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E4",
        "E3"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts"
      ],
      "fixes": null,
      "id": "E17",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Core mode choice route",
      "why": "Core shows the card from the Kit proposal and turns the click into scope:choose and a message to the agent"
    },
    {
      "acceptance": [
        "chooseWorkflowMode reaches Core workflow-mode-choose"
      ],
      "checks": [],
      "commitMessage": "feat: bridge the execution mode choice",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E17"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts"
      ],
      "fixes": null,
      "id": "E18",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Bridge for the mode choice",
      "why": "The renderer reaches Core only through the bridge"
    },
    {
      "acceptance": [
        "the card shows the recommendation first with its reason and the hint to answer in chat",
        "a click calls Core and shows the saved choice"
      ],
      "checks": [],
      "commitMessage": "feat: show the execution mode card",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E18"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/project-workflow-ui/modules/execution-mode-card/src/execution-mode-card-facade.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx",
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts",
        ".harness/product-tree/product-tree.json"
      ],
      "fixes": null,
      "id": "E19",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Mode choice card in the chat",
      "why": "The user picks the mode with one click, like in Workflow Pilot"
    },
    {
      "acceptance": [
        "the active plan with progress and task rows shows under the agent card in both modes, titled Agent or Orchestrator",
        "a row with an executor opens its session and bound executors are not duplicated under the orchestrator"
      ],
      "checks": [],
      "commitMessage": "feat: show the plan in the sidebar",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E16"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel-facade.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx",
        ".harness/product-tree/product-tree.json"
      ],
      "fixes": null,
      "id": "E20",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Plan in the sidebar",
      "why": "The user follows the plan and opens executor sessions from its rows"
    },
    {
      "acceptance": [
        "Project-wide documents describe the round result",
        "The round digest records result, decisions, contracts and references"
      ],
      "checks": [],
      "commitMessage": "docs: reconcile documentation for R1",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E1",
        "E2",
        "E3",
        "E4",
        "E5",
        "E6",
        "E7",
        "E8",
        "E9",
        "E10",
        "E11",
        "E12",
        "E13",
        "E14",
        "E15",
        "E16",
        "E17",
        "E18",
        "E19",
        "E20"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/workflow-kit/WorkflowKitExecutionModes.md"
      ],
      "fixes": null,
      "id": "DOCS-R1",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R1",
      "status": "TODO",
      "title": "Reconcile project documentation and write the round digest",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "npm run package:mac succeeds and release/mac-arm64/Harness AI.app exists"
      ],
      "checks": [],
      "commitMessage": "chore: package execution modes release",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "E13",
        "E19",
        "E20",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/execution-modes-package-2026-11-04.md"
      ],
      "fixes": null,
      "id": "D1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Package the macOS release",
      "why": "The user checks the release in the packaged app"
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: execution-modes-2026-11-04 (ACTIVE)
- Delivery: IN_PROGRESS
- Current task: none
- Progress: 3/22
- Revision: 37

## Objective

Workflow Kit execution modes: the user picks sequential or orchestrated on a choice card when the plan is proposed; sequential is one agent, orchestrated runs every task by Claude subagent executors attached to their worktrees with checked commits and merge integration into main; Kit-formed git identity; the plan with live progress and executor sessions in the Harness sidebar; small Kit fixes; a new macOS release.

## Acceptance

- scope:propose and the in-chat choice card create the scope in the chosen mode; without parallel work the card offers sequential or refine, and a repeated proposal without parallel work after refine becomes sequential automatically
- In orchestrated mode Claude subagent executors commit their task in their own worktree and the orchestrator integrates it into main with checks; independent tasks run in parallel
- Kit commits carry a real git identity taken from git config; placeholders are refused
- The sidebar shows the active plan with live progress under the agent card; a task row opens its executor session
- A new macOS package is built and verified

## Rounds

### R1 — Implementation (implementation, OPEN)

- [DONE] E1 — Plan labels and execution block (work)
  - Commit: feat: add parallel labels and execution block to workflow plans
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-model.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-execution.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-document.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-service-tasks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-transitions.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-validation.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-execution.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts
- [DONE] E2 — Kit-formed git identity in transactions (work)
  - Commit: feat: form and verify git identity in workflow commits
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-identity.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-runner.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-history.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-identity.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-repair.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-test-repo.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-doctor.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-migrate.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-hooks.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-lifecycle.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-project.test.mjs, scripts/build-workflow-kit.mjs
- [TODO] E3 — Installer identity, host marker, gitignore and doctor (work)
  - Commit: feat: install git identity and host marker
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts
  - Depends on: E2
- [TODO] E4 — Scope proposal and mode choice (work)
  - Commit: feat: propose scopes and record the user's execution mode
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-execution-mode/src/workflow-execution-mode-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-execution.ts, .harness/product-tree/product-tree.json
  - Depends on: E1
- [TODO] E5 — Assignment records and scheduling (work)
  - Commit: feat: schedule and create orchestrated assignments
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-schedule.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-records.ts, .harness/product-tree/product-tree.json
  - Depends on: E4
- [TODO] E6 — Attach executors and guard their worktree (work)
  - Commit: feat: attach executors to their worktrees
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-attach.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-hooks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts
  - Depends on: E5
- [TODO] E7 — Executor worktree setup and cleanup (work)
  - Commit: feat: set up and clean executor worktrees
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-setup.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-cleanup.ts
  - Depends on: E6
- [TODO] E8 — Integration proof and history (work)
  - Commit: feat: prove executor sources for integration
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-proof.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-history.ts, .harness/product-tree/product-tree.json
  - Depends on: E6
- [TODO] E9 — Merge integration with journal and continue (work)
  - Commit: feat: integrate executor results into main
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/workflow-integration-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-merge.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/integration-journal.ts
  - Depends on: E7, E8
- [TODO] E10 — Agent roles in recovery and AGENTS (work)
  - Commit: feat: teach agents the execution roles
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-sections.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-roles.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-sections.ts
  - Depends on: E4, E9
- [TODO] E11 — Kit status and autopilot for orchestration (work)
  - Commit: feat: report orchestration in kit status and autopilot
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-status.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-decision.ts
  - Depends on: E9
- [DONE] E12 — Small Kit fixes from test runs (work)
  - Commit: fix: small workflow kit defects from test runs
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-apply.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-model.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-repair.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-text.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-lifecycle.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-validation.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-apply.test.mjs
- [TODO] E13 — Orchestration scenario test on real worktrees (work)
  - Commit: test: prove orchestrated execution on real worktrees
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-integration/src/orchestration-scenario.test.mjs
  - Depends on: E10, E11, E12
- [TODO] E14 — Core watches the plan and publishes status (work)
  - Commit: feat: publish workflow status on plan changes
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-watch.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts
  - Depends on: E11
- [TODO] E15 — Claude subagent working directory (work)
  - Commit: feat: report claude subagent working directory
  - Files: product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-files.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-observer.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/provider-adapter-contract/src/provider-adapter-contract-facade.ts
- [TODO] E16 — Core plan view with executor sessions (work)
  - Commit: feat: build the plan view with executor sessions
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-plan-view.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts
  - Depends on: E14, E15
- [TODO] E17 — Core mode choice route (work)
  - Commit: feat: route the execution mode choice through core
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts
  - Depends on: E4, E3
- [TODO] E18 — Bridge for the mode choice (work)
  - Commit: feat: bridge the execution mode choice
  - Files: product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts
  - Depends on: E17
- [TODO] E19 — Mode choice card in the chat (work)
  - Commit: feat: show the execution mode card
  - Files: product-parts/application-shell/clusters/project-workflow-ui/modules/execution-mode-card/src/execution-mode-card-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, .harness/product-tree/product-tree.json
  - Depends on: E18
- [TODO] E20 — Plan in the sidebar (work)
  - Commit: feat: show the plan in the sidebar
  - Files: product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, .harness/product-tree/product-tree.json
  - Depends on: E16
- [TODO] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/workflow-kit/WorkflowKitExecutionModes.md
  - Depends on: E1, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11, E12, E13, E14, E15, E16, E17, E18, E19, E20
- [TODO] D1 — Package the macOS release (delivery)
  - Commit: chore: package execution modes release
  - Files: docs/evidence/execution-modes-package-2026-11-04.md
  - Depends on: E13, E19, E20, DOCS-R1

State changes only through `scripts/workflow` commands. History lives in Git.
