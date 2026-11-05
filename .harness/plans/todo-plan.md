# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-04T15:01:20.812Z",
    "scopeId": "release-fixes-2026-11-04-2"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 171,
  "rounds": [
    {
      "digest": {
        "contracts": [
          "workflow-kit/module.md + WorkflowKitCommands.md: pause:set, schema, context, CONTEXT_MISSING/CONTEXT_TOO_LARGE, WORKFLOW_PAUSED.",
          "workflow-recovery/module.md: schema section, required documents inline with overBudget, documentsMap.",
          "workflow-plan, workflow-quality module.md: input descriptors, details.field, budget.briefBytes, oversizedDocuments.",
          "workflow-autopilot, session-request-handler module.md: on by default, paused stop, pauseState, refreshPause.",
          "core-runtime-process/module.md + WorkflowKitCoreRpc.md: workflow-pause-set, NO_WORKSPACE, list-workspaces without builtInWorkspaceId.",
          "workflow-installer/module.md: KIT_VERSION 2.2.0, Inputs and documents block, doctor doc-size.",
          "project-plan-panel, workflow-status-strip, session-window, session-sidebar module.md: pause button, no switch, start screen.",
          "provider-home-manager/module.md: withRealGitConfig for Claude auth env and the Kimi ACP process."
        ],
        "decisions": [
          "Pause is Kit state (pause.json): the task in progress always finishes; only the next task:start in main and assignment:create are refused, executor worktrees are unaffected.",
          "In orchestrated mode the pause holds back only hand-out and an unstarted QUALITY; integration, cleanup and started main tasks continue.",
          "pauseState (running, pausing, paused) is derived in Core; the plan panel button only renders it and sends workflow-pause-set with a fixed note naming the button.",
          "workflow-autopilot-set stays internal (mode card); bridge and preload no longer expose it and the status strip lost its switch.",
          "Input descriptors are data owned by workflow-plan and workflow-quality, kept in sync with validators by contract tests.",
          "Brief budget briefBytes (60000) counts only document text; the documents map has its own 4000 bytes; context answers within 28000 bytes.",
          "Doctor doc-size scans every project Markdown file except Kit files and the plan archive, and only warns.",
          "No built-in project: the session registry returns [], the snapshot workspace may be null, project-scoped requests answer NO_WORKSPACE."
        ],
        "references": [
          "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "docs/architecture/workflow-kit/WorkflowKitCommands.md",
          "docs/architecture/workflow-kit/WorkflowKitRecovery.md#2.1. Карта документов",
          "docs/architecture/workflow-kit/WorkflowKitCoreRpc.md",
          "docs/architecture/workflow-kit/WorkflowKitOrchestration.md#6. Порядок работы оркестратора",
          "docs/architecture/workflow-kit/WorkflowKitInstallation.md#4. Доктор (`doctor [--fix]`)"
        ],
        "result": "Agents now get Kit inputs and documents as text: `schema` descriptors (also in the recovery packet), document text in executor briefs, required documents always inline, the documents map and the `context` command, plus a doctor doc-size warning (Kit 2.2.0). The autopilot is on by default and the user pauses the plan from the plan panel (Kit pause state, Core pauseState). Agent processes see the real git config, and Core has no built-in project: the app opens on a start screen."
      },
      "id": "R1",
      "kind": "implementation",
      "status": "CLOSED",
      "title": "Implementation"
    },
    {
      "digest": {
        "contracts": [
          "workflow-installer/module.md: KIT_VERSION 2.2.1, dependency folders in the .gitignore section.",
          "workflow-git/module.md: stage() skips ignored untracked paths; cancelRepair and discardPreparation.",
          "workflow-quality/module.md + workflow-plan/module.md: unknownPlannedChecks, ensurePlannedChecks, honest checks descriptor.",
          "workflow-kit/module.md + WorkflowKitCommands.md: planned CHECK_UNKNOWN, assignment:cancel, repair --cancel.",
          "workflow-assignment/module.md: cancel with ASSIGNMENT_INTEGRATED, ASSIGNMENT_DIRTY, ASSIGNMENT_CANCEL_FAILED."
        ],
        "decisions": [
          "KIT_VERSION 2.2.1: the managed .gitignore block changed, so 2.2.0 installations read as KIT_OUTDATED and install --update rewrites the block.",
          "Planned checks: CONFIGURED profile ids plus implicit guards; before QUALITY the id form and kit builtins only, other ids are left to QUALITY and task:start.",
          "Only new tasks and changed checks are checked; old plan tasks never block a planning command.",
          "assignment:cancel deletes the branch with -D even with unintegrated commits and reports the tip; a dirty worktree needs --force.",
          "repair --cancel never undoes commits: with HEAD moved it stays REPAIR_MANUAL and names git reset --soft with the user's consent."
        ],
        "references": [
          "docs/architecture/KitFixes-2026-11-05.md",
          "docs/architecture/workflow-kit/WorkflowKitCommands.md",
          "docs/architecture/workflow-kit/WorkflowKitOrchestration.md",
          "docs/architecture/workflow-kit/WorkflowKitQuality.md",
          "docs/architecture/workflow-kit/WorkflowKitProcess.md"
        ],
        "result": "Kit 2.2.1 fixes from the Workflow_Kit project: the managed .gitignore ignores node_modules/, .venv/ and __pycache__/; commit staging skips ignored paths outside the index, so removing a folder from the index commits; planning refuses tasks[].checks that are not quality check ids (CHECK_UNKNOWN); assignment:cancel drops a stuck assignment; repair --cancel restores a preparation whose index or plan changed while HEAD did not."
      },
      "id": "R2",
      "kind": "fixes",
      "status": "CLOSED",
      "title": "Kit fixes 2026-11-05"
    },
    {
      "digest": null,
      "id": "R3",
      "kind": "fixes",
      "status": "OPEN",
      "title": "Kit fixes 2026-11-05 (2)"
    }
  ],
  "schema": "harness-workflow-plan/1",
  "scope": {
    "acceptance": [
      "Agents get the input schema of their next step and document text inline, never a path to read",
      "The context command returns marked documents within the output budget",
      "The autopilot runs by default; Pause in the plan panel stops before the next task and Continue resumes",
      "An agent can install the Kit in a new folder with the user's git identity",
      "The app has no built-in project and works with an empty project list",
      "A new macOS package is built and published as a GitHub release"
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-04T15:08:20.492Z",
      "text": "User 2026-11-04: 'Согласен. Закрывая предыдущие составляй новую спецификацию и to-do plan, и выполняя ее вплоть уже до публикации на GitHub.' Built-in project removal: 'Удали из перечня проектов сам проект Harness AI… чтобы не повторилась ситуация, при которой я случайно начну создавать сессию в этом репозитории.'"
    },
    "baselineCommit": "7f00de015fa76e68772219851995440828a5510c",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/architecture/workflow-kit/WorkflowKitOrchestration.md",
        "required": false
      },
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      }
    ],
    "decisions": [
      {
        "at": "2026-11-04T15:08:20.492Z",
        "text": "Pause is Kit state so the agent cannot start the next task while paused"
      },
      {
        "at": "2026-11-04T15:08:20.492Z",
        "text": "Schemas are descriptors checked against the validators by contract tests"
      },
      {
        "at": "2026-11-04T15:08:20.492Z",
        "text": "No silent truncation: over-budget context is refused when the plan is created"
      },
      {
        "at": "2026-11-04T15:08:20.492Z",
        "text": "Tag v2026.11.4.2 as the second release of the day"
      }
    ],
    "delivery": "IN_PROGRESS",
    "id": "release-fixes-2026-11-04-3",
    "objective": "Give agents their input schemas and document text inline, add the Kit context command and documents map, run the autopilot by default with a Kit pause and a plan-panel pause button, give agent processes the real git config, remove the built-in project, build the macOS release and publish it on GitHub.",
    "spec": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "pause:set --on|--off --note stores .harness/workflow/local/pause.json",
        "status and autopilot:status show paused",
        "task:start in main and assignment:create refuse WORKFLOW_PAUSED; executor worktrees are not affected"
      ],
      "checks": [],
      "commitMessage": "feat: pause the workflow through the kit",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "4. Автопилот по умолчанию и пауза"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-pause.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-text.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-pause.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-status.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-pause.test.mjs"
      ],
      "fixes": null,
      "id": "A1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Kit pause state",
      "why": "Pause must be a workflow fact the agent cannot bypass"
    },
    {
      "acceptance": [
        "descriptors for scope:create, scope:propose, plan:extend, task:update, carryover, the digest and quality:apply reuse the validator constants",
        "contract tests: the example passes, every missing required field and exceeded limit gives the descriptor code and details.field",
        "input refusals name the field"
      ],
      "checks": [],
      "commitMessage": "feat: describe kit inputs as schemas",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "1. Схемы входного JSON"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-execution.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-field-checks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-checks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-rounds.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-service-tasks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-transitions.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-validation.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-input-schema.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-apply.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-config.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-input-schema.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-input-schema.test.mjs"
      ],
      "fixes": null,
      "id": "K1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Input schema descriptors",
      "why": "Agents rebuild the input JSON shape from the bundle code"
    },
    {
      "acceptance": [
        "GIT_CONFIG_GLOBAL points to the real ~/.gitconfig when HOME is overridden, the variable is unset and the file exists",
        "Claude auth environment and the Kimi process use it; tests cover the helper"
      ],
      "checks": [],
      "commitMessage": "fix: give agent processes the real git config",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "5. Git-идентичность в процессах агентов"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/auth/claude-auth-runtime.ts",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-acp-session-process.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-test-repo.mjs",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-auth-git-config.test.mjs",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/module.md",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-acp-session-transport.test.mjs",
        "product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/module.md",
        "product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.test.mjs",
        "product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts"
      ],
      "fixes": null,
      "id": "E1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Real git config for agent processes",
      "why": "Agents with a provider HOME do not see the user's git identity"
    },
    {
      "acceptance": [
        "the registry can be empty and has no built-in project",
        "a saved harness-ai-local entry is an ordinary removable project",
        "without an active project adapters are not registered and project requests get NO_WORKSPACE"
      ],
      "checks": [],
      "commitMessage": "fix: remove the built-in project from core",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "6. Без встроенного проекта"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-registry",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-rebuild-rpc.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-identity.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-lifecycle.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-lifecycle.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-facade.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workspace-rpc.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workspace-rpc.ts",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-registry/module.md",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-registry/src/session-registry-facade.test.mjs",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-registry/src/session-registry-facade.ts",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts",
        "product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/module.md",
        "product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.test.mjs",
        "product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.ts"
      ],
      "fixes": null,
      "id": "W1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Core without a built-in project",
      "why": "The developer repository is baked into the app as an undeletable project"
    },
    {
      "acceptance": [
        "eligible sessions start with the autopilot enabled",
        "the paused stop reason comes from autopilot:status before other scope reasons",
        "the snapshot carries pauseState running|pausing|paused derived in Core"
      ],
      "checks": [],
      "commitMessage": "feat: run the autopilot by default and stop on pause",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "4. Автопилот по умолчанию и пауза"
        }
      ],
      "dependencies": [
        "A1"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-decision.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-decision.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-pause.test.mjs",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.test.mjs",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.ts"
      ],
      "fixes": null,
      "id": "A2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Autopilot on by default with a pause stop",
      "why": "The autopilot was off by default and had no pause"
    },
    {
      "acceptance": [
        "scripts/workflow schema <command> prints the descriptor and an example, also in executor worktrees",
        "the recovery packet has a schema section for the next step (no scope, QUALITY, DOCS, acceptance or fixes round)"
      ],
      "checks": [],
      "commitMessage": "feat: print input schemas and put them in the packet",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "1. Схемы входного JSON"
        }
      ],
      "dependencies": [
        "K1"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery",
        "docs/architecture/workflow-kit/WorkflowKitCommands.md",
        "docs/DOCUMENTATION_INDEX.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-schema.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-executor.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-schema.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-budget.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-schema.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-schema.test.mjs"
      ],
      "fixes": null,
      "id": "K2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Kit schema command and packet schema",
      "why": "The agent must get the schema of its next step inline"
    },
    {
      "acceptance": [
        "workflow-pause-set {sessionId, paused} calls Kit pause:set and on resume evaluates the owner autopilot at once",
        "the autopilot snapshot with pauseState reaches subscribers"
      ],
      "checks": [],
      "commitMessage": "feat: route the workflow pause through core",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "4. Автопилот по умолчанию и пауза"
        }
      ],
      "dependencies": [
        "A2",
        "W1"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-identity.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-pause.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-pause.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-plan-view.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-watch.test.mjs"
      ],
      "fixes": null,
      "id": "A3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Core pause route",
      "why": "The pause button needs a Core route"
    },
    {
      "acceptance": [
        "the brief carries every context document (or heading section, or the scope spec) inside document markers",
        "budget.briefBytes (default 60000) with a default for old configs",
        "scope:create, scope:propose, plan:extend, task:update and assignment:create refuse CONTEXT_TOO_LARGE or CONTEXT_MISSING"
      ],
      "checks": [],
      "commitMessage": "feat: put document text into executor briefs",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "2. Текст документов в поручении и пакете"
        }
      ],
      "dependencies": [
        "K2"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-context-budget.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-config.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-config.test.mjs"
      ],
      "fixes": null,
      "id": "K3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Document text in executor briefs",
      "why": "Executors read context documents in several Read passes"
    },
    {
      "acceptance": [
        "channel and preload setWorkflowPause; setWorkflowAutopilot is no longer exposed"
      ],
      "checks": [],
      "commitMessage": "feat: bridge the workflow pause",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "4. Автопилот по умолчанию и пауза"
        }
      ],
      "dependencies": [
        "A3"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/module.md",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs",
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md",
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs"
      ],
      "fixes": null,
      "id": "A4",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Pause bridge",
      "why": "The renderer needs the pause route and no autopilot toggle"
    },
    {
      "acceptance": [
        "required task documents are always inline, the packet is marked overBudget instead",
        "a documents map (path, bytes, level-two headings, 4000 bytes, spec folder first) in the packet and the brief"
      ],
      "checks": [],
      "commitMessage": "feat: keep required documents inline with a documents map",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "3. Дополнительный контекст без чтения кусками"
        }
      ],
      "dependencies": [
        "K3"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-budget.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-documents.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-gather.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-model.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-documents.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-packet.test.mjs"
      ],
      "fixes": null,
      "id": "K4",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Recovery packet inline documents and map",
      "why": "The packet replaced required documents with a read-the-file line"
    },
    {
      "acceptance": [
        "the autopilot toggle is gone from the status strip",
        "the plan panel shows Pause, Pausing after the current task (disabled) or Continue by pauseState",
        "new strings are localized ui_labels"
      ],
      "checks": [],
      "commitMessage": "feat: pause the plan from the plan panel",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "4. Автопилот по умолчанию и пауза"
        }
      ],
      "dependencies": [
        "A4"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/project-workflow-ui",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar",
        "product-parts/application-shell/clusters/session-interface/modules/session-window",
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts",
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.test.mjs",
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/module.md",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel-facade.tsx",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel.css",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel.test.mjs",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-pause-state.ts",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/module.md",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/src/workflow-status-state.ts",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/src/workflow-status-strip-facade.tsx",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/src/workflow-status-strip.test.mjs",
        "product-parts/application-shell/clusters/project-workflow-ui/src/project-workflow-ui.css",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/module.md",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.test.mjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/module.md",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts"
      ],
      "fixes": null,
      "id": "A5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Pause button in the plan panel",
      "why": "The user pauses the plan from the plan itself"
    },
    {
      "acceptance": [
        "context <path>[#heading] prints marked documents within 28000 bytes, lists what did not fit, splits an oversized document by level-two sections",
        "--list prints the documents map; refusals for paths outside the project, Kit files and non-text files; allowed in executor worktrees"
      ],
      "checks": [],
      "commitMessage": "feat: read documents through the kit context command",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "3. Дополнительный контекст без чтения кусками"
        }
      ],
      "dependencies": [
        "K4"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-context.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context-command.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-executor.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-documents.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-documents.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts"
      ],
      "fixes": null,
      "id": "K5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Kit context command",
      "why": "Extra context must not be read in truncated passes"
    },
    {
      "acceptance": [
        "without a project the start screen offers Open Project and New Project",
        "the projects menu removes any project",
        "the session snapshot has no stand-in project: workspace is null without an active project"
      ],
      "checks": [],
      "commitMessage": "fix: show the start screen without a project",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "6. Без встроенного проекта"
        }
      ],
      "dependencies": [
        "W1"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/session-interface/modules/session-window",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-registry",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/module.md",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.test.mjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/module.md",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-markdown-content.test.mjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-start-screen.test.mjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-start-screen.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.test.mjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-workspaces.ts",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.test.mjs",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts"
      ],
      "fixes": null,
      "id": "W2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Interface without a project",
      "why": "The app must work with an empty project list"
    },
    {
      "acceptance": [
        "doctor warns about every Markdown file over budget.documentBytes",
        "the managed AGENTS.md section names schema and context and forbids reading Kit runtime files, generated code, logs and transcripts",
        "KIT_VERSION 2.2.0"
      ],
      "checks": [],
      "commitMessage": "feat: check document sizes in doctor and update managed text",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/ReleaseFixes-2026-11-04-3.md",
          "required": true,
          "heading": "3. Дополнительный контекст без чтения кусками"
        }
      ],
      "dependencies": [
        "K5"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-doctor.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs"
      ],
      "fixes": null,
      "id": "K6",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Doctor doc-size and managed text 2.2.0",
      "why": "Every document must fit one Read and agents must know the new commands"
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
        "A1",
        "K1",
        "E1",
        "W1",
        "A2",
        "K2",
        "A3",
        "K3",
        "A4",
        "K4",
        "A5",
        "K5",
        "W2",
        "K6"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/ReleaseFixes-2026-11-04-3.md",
        ".harness/product-tree/product-tree.json",
        ".harness/product-tree/product-tree.md",
        "docs/DOCUMENTATION_INDEX.md",
        "docs/architecture/workflow-kit/WorkflowKit.md",
        "docs/architecture/workflow-kit/WorkflowKitCommands.md",
        "docs/architecture/workflow-kit/WorkflowKitCoreRpc.md",
        "docs/architecture/workflow-kit/WorkflowKitExecutionModes.md",
        "docs/architecture/workflow-kit/WorkflowKitInstallation.md",
        "docs/architecture/workflow-kit/WorkflowKitOrchestration.md",
        "docs/architecture/workflow-kit/WorkflowKitProcess.md",
        "docs/architecture/workflow-kit/WorkflowKitQuality.md",
        "docs/architecture/workflow-kit/WorkflowKitRecovery.md",
        "product-parts/application-shell/clusters/project-workflow-ui/cluster.md",
        "product-parts/application-shell/clusters/session-interface/cluster.md",
        "product-parts/core-runtime/clusters/project-workflow/cluster.md",
        "product-parts/core-runtime/clusters/session-runtime/cluster.md",
        "product-parts/core-runtime/clusters/workspace-architecture/cluster.md",
        "product-parts/core-runtime/product-part.md",
        "product-parts/provider-runtime/clusters/provider-home-and-auth/cluster.md"
      ],
      "fixes": null,
      "id": "DOCS-R1",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R1",
      "status": "DONE",
      "title": "Reconcile project documentation and write the round digest",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "npm run package:mac succeeds and release/mac-arm64/Harness AI.app exists"
      ],
      "checks": [],
      "commitMessage": "chore: package release fixes round 3",
      "confirmation": "Пользователь: «Закрывая предыдущие составляй новую спецификацию и to-do plan, и выполняя ее вплоть уже до публикации на GitHub.»",
      "context": [],
      "dependencies": [
        "A1",
        "K1",
        "E1",
        "W1",
        "A2",
        "K2",
        "A3",
        "K3",
        "A4",
        "K4",
        "A5",
        "K5",
        "W2",
        "K6",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-3-package-2026-11-04.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "D1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "DONE",
      "title": "Package the macOS release",
      "why": "The user checks the release in the packaged app"
    },
    {
      "acceptance": [
        "the history passes the secret scan",
        "main is pushed to origin and tag v2026.11.4.2 created",
        "a GitHub Release with the digest and the app zip exists"
      ],
      "checks": [],
      "commitMessage": "chore: publish release fixes round 3",
      "confirmation": "Пользователь: «составляй новую спецификацию и to-do plan, и выполняя ее вплоть уже до публикации на GitHub»",
      "context": [],
      "dependencies": [
        "D1",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-3-publish-2026-11-04.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "P1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "DONE",
      "title": "Publish the release on GitHub",
      "why": "Every plan ends with a GitHub publication"
    },
    {
      "acceptance": [
        "The managed .gitignore block lists node_modules/, .venv/ and __pycache__/",
        "KIT_VERSION is 2.2.1 and install --update rewrites the block",
        "Installer tests cover the new block"
      ],
      "checks": [],
      "commitMessage": "fix: ignore dependency folders in the managed gitignore block",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "1. Каталоги зависимостей и коммиты"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs"
      ],
      "fixes": null,
      "id": "F1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "Ignore dependency folders in the managed gitignore",
      "why": "quality:apply with install committed 26 MB of node_modules in a new project"
    },
    {
      "acceptance": [
        "Untracked paths that git ignores are not passed to git add; a staged deletion of them is committed",
        "Tracked paths are staged as before; a path neither in the index nor on disk does not break the commit",
        "A test commits the removal of a folder from the index together with its .gitignore entry through commit --task"
      ],
      "checks": [],
      "commitMessage": "fix: skip ignored untracked paths when staging a kit commit",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "1. Каталоги зависимостей и коммиты"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-ignored-commit.test.mjs"
      ],
      "fixes": null,
      "id": "F2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "Skip ignored paths when staging a commit",
      "why": "commit --task failed with paths are ignored after git rm --cached of an ignored folder"
    },
    {
      "acceptance": [
        "workflow-quality refuses unknown planned check ids with CHECK_UNKNOWN: profile ids when CONFIGURED, id form and kit builtins before",
        "The schema describes tasks[].checks and the patch checks as quality check ids with the rule in rules",
        "Tests cover both profile states"
      ],
      "checks": [],
      "commitMessage": "fix: define planned check ids and describe task checks honestly",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "2. Проверка `tasks[].checks` при планировании"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-runner.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-input-schema.test.mjs"
      ],
      "fixes": null,
      "id": "F3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "Planned check ids in the quality module and the schema",
      "why": "The schema called checks extra manual checks and an agent wrote free text there"
    },
    {
      "acceptance": [
        "scope:create, scope:propose, scope:choose, plan:extend and task:update refuse unknown check ids with CHECK_UNKNOWN and write nothing",
        "Only new tasks and tasks whose checks change are checked",
        "A test covers the refusals and a valid optional check"
      ],
      "checks": [],
      "commitMessage": "fix: check task check ids in scope, extend and task update",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "2. Проверка `tasks[].checks` при планировании"
        }
      ],
      "dependencies": [
        "F3"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-plan-checks.test.mjs"
      ],
      "fixes": null,
      "id": "F4",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "Refuse unknown task checks when planning",
      "why": "An unknown check must fail when the plan is written, not at assignment:attach"
    },
    {
      "acceptance": [
        "A record that is not INTEGRATED is removed with its worktree and branch",
        "A dirty worktree is refused with ASSIGNMENT_DIRTY unless forced",
        "A git refusal keeps the record so the cancel can be repeated"
      ],
      "checks": [],
      "commitMessage": "feat: cancel an assignment record with its worktree and branch",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "3. Отмена назначения (`assignment:cancel`)"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-cancel.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-cleanup.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-records.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-cancel.test.mjs"
      ],
      "fixes": null,
      "id": "F5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "Cancel an assignment in the assignment module",
      "why": "A stuck assignment could be removed only by deleting its record by hand"
    },
    {
      "acceptance": [
        "assignment:cancel --id <id> [--force] works in main and is refused in an executor worktree",
        "The task in main stays TODO and the text prints the next step",
        "help lists the command"
      ],
      "checks": [],
      "commitMessage": "feat: add the assignment:cancel command",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "3. Отмена назначения (`assignment:cancel`)"
        }
      ],
      "dependencies": [
        "F5"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-assignment.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-assignment.test.mjs",
        "docs/architecture/workflow-kit/WorkflowKitCommands.md"
      ],
      "fixes": null,
      "id": "F6",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "assignment:cancel command",
      "why": "The orchestrator needs a Kit command to drop a stuck assignment"
    },
    {
      "acceptance": [
        "With HEAD unchanged repair --cancel restores the index and the original plan, keeps working-tree files and removes the journal",
        "With HEAD changed it stays REPAIR_MANUAL with details and a clear next action",
        "repair --apply points to repair --cancel when the preparation changed"
      ],
      "checks": [],
      "commitMessage": "fix: cancel a commit preparation whose index changed",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "4. Отмена застрявшей подготовки коммита (`repair --cancel`)"
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-repair.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-repair.test.mjs",
        "docs/architecture/workflow-kit/WorkflowKitCommands.md"
      ],
      "fixes": null,
      "id": "F7",
      "iteration": 1,
      "kind": "work",
      "roundId": "R2",
      "status": "DONE",
      "title": "Cancel a changed commit preparation in repair",
      "why": "repair --cancel answered REPAIR_MANUAL when the index changed after preparation"
    },
    {
      "acceptance": [
        "Project-wide documents describe the round result",
        "The round digest records result, decisions, contracts and references"
      ],
      "checks": [],
      "commitMessage": "docs: reconcile documentation for R2",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md",
        "docs/DOCUMENTATION_INDEX.md",
        "docs/architecture/KitFixes-2026-11-05.md",
        "docs/architecture/workflow-kit/WorkflowKit.md",
        "docs/architecture/workflow-kit/WorkflowKitCommands.md",
        "docs/architecture/workflow-kit/WorkflowKitExecutionModes.md",
        "docs/architecture/workflow-kit/WorkflowKitInstallation.md",
        "docs/architecture/workflow-kit/WorkflowKitOrchestration.md",
        "docs/architecture/workflow-kit/WorkflowKitProcess.md",
        "docs/architecture/workflow-kit/WorkflowKitQuality.md",
        "product-parts/core-runtime/clusters/project-workflow/cluster.md"
      ],
      "fixes": null,
      "id": "DOCS-R2",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R2",
      "status": "DONE",
      "title": "Reconcile project documentation and write the round digest",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "npm run build:workflow-kit succeeds and dist/workflow-kit/workflow.mjs reports KIT_VERSION 2.2.1",
        "A smoke run on a temporary project shows the gitignore block, assignment:cancel and the planning CHECK_UNKNOWN",
        "No app package, push or publication"
      ],
      "checks": [],
      "commitMessage": "chore: build the workflow kit 2.2.1 bundle",
      "confirmation": "Пользователь: «Раунд исправлений: plan:extend добавит в этот scope раунд: исправления Kit с тестами, DOCS и delivery-задачу сборки бандла Kit (без публикации приложения и push)»",
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "required": true,
          "heading": "5. Сборка бандла"
        }
      ],
      "dependencies": [
        "DOCS-R2"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/kit-fixes-2026-11-05-bundle.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "D2",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R2",
      "status": "DONE",
      "title": "Build the Workflow Kit bundle",
      "why": "The user installs the fixed Kit into another project from the bundle"
    },
    {
      "acceptance": [
        "absentPaths(root, files) returns the paths outside the index that are missing on disk or ignored by git",
        "stage() stages exactly the paths absentPaths does not name",
        "A workflow-git test covers absentPaths after git rm -r --cached of an ignored folder"
      ],
      "checks": [],
      "commitMessage": "fix: name the paths absent from a commit candidate",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "heading": "6. Удалённые из индекса пути и проверки содержимого",
          "required": true
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs"
      ],
      "fixes": null,
      "id": "F8",
      "iteration": 1,
      "kind": "work",
      "roundId": "R3",
      "status": "DONE",
      "title": "Name the paths a commit candidate will not contain",
      "why": "Content checks need the paths a commit removes from the index; the rule must match stage()"
    },
    {
      "acceptance": [
        "StageRequest.removed lists paths the commit removes",
        "kit:file-lines, kit:doc-size, kit:md-links and kit:conflict-markers skip removed paths; kit:docs-contracts still counts them",
        "The {files} argument never receives removed paths; appliesTo still sees every candidate path",
        "A runner test covers removed paths for each builtin and for {files}"
      ],
      "checks": [],
      "commitMessage": "fix: skip paths removed by the commit in content checks",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "heading": "6. Удалённые из индекса пути и проверки содержимого",
          "required": true
        }
      ],
      "dependencies": [
        "F8"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-runner.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs"
      ],
      "fixes": null,
      "id": "F9",
      "iteration": 1,
      "kind": "work",
      "roundId": "R3",
      "status": "DONE",
      "title": "Skip removed paths in content checks",
      "why": "kit:file-lines failed on node_modules files removed from the index but kept on disk"
    },
    {
      "acceptance": [
        "The pre-commit hook and the prepare stage pass absentPaths of the selected files as removed",
        "commit --task after git rm -r --cached of a folder with a file over policy.maxFileLines and node_modules/ in .gitignore passes; the deletion is committed and the files stay on disk"
      ],
      "checks": [],
      "commitMessage": "fix: do not check files a commit removes from the index",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "heading": "6. Удалённые из индекса пути и проверки содержимого",
          "required": true
        }
      ],
      "dependencies": [
        "F8",
        "F9"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-hooks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-ignored-commit.test.mjs"
      ],
      "fixes": "F2",
      "id": "F10",
      "iteration": 1,
      "kind": "work",
      "roundId": "R3",
      "status": "TODO",
      "title": "Pass removed paths to the commit and prepare checks",
      "why": "commit --task after git rm -r --cached node_modules failed with kit:file-lines on files outside the commit"
    },
    {
      "acceptance": [
        "KIT_VERSION is 2.2.2 and installer tests expect it",
        "module.md names 2.2.2 and why it was raised"
      ],
      "checks": [],
      "commitMessage": "chore: raise the workflow kit version to 2.2.2",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "heading": "6. Удалённые из индекса пути и проверки содержимого",
          "required": true
        }
      ],
      "dependencies": [
        "F10"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs"
      ],
      "fixes": null,
      "id": "F11",
      "iteration": 1,
      "kind": "work",
      "roundId": "R3",
      "status": "TODO",
      "title": "Raise the Kit version to 2.2.2",
      "why": "Installed 2.2.1 projects must read as outdated so install --update brings the fixed runtime"
    },
    {
      "acceptance": [
        "Project-wide documents describe the round result",
        "The round digest records result, decisions, contracts and references"
      ],
      "checks": [],
      "commitMessage": "docs: reconcile documentation for R3",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "F8",
        "F9",
        "F10",
        "F11"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md"
      ],
      "fixes": null,
      "id": "DOCS-R3",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R3",
      "status": "TODO",
      "title": "Reconcile project documentation and write the round digest",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "npm run build:workflow-kit succeeds and dist/workflow-kit/workflow.mjs reports KIT_VERSION 2.2.2",
        "A smoke run updates a 2.2.1 project with the new bundle and commits a task after git rm -r --cached node_modules with a large file",
        "No app package, push or publication"
      ],
      "checks": [],
      "commitMessage": "chore: build the workflow kit 2.2.2 bundle",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitFixes-2026-11-05.md",
          "heading": "7. Сборка бандла 2.2.2",
          "required": true
        }
      ],
      "dependencies": [
        "DOCS-R3"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/kit-fixes-2026-11-05-bundle-2.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "D3",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R3",
      "status": "TODO",
      "title": "Build the Workflow Kit 2.2.2 bundle",
      "why": "The user updates Workflow_Kit and other projects from the bundle"
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: release-fixes-2026-11-04-3 (ACTIVE)
- Delivery: IN_PROGRESS
- Current task: none
- Progress: 28/32
- Revision: 171

## Objective

Give agents their input schemas and document text inline, add the Kit context command and documents map, run the autopilot by default with a Kit pause and a plan-panel pause button, give agent processes the real git config, remove the built-in project, build the macOS release and publish it on GitHub.

## Acceptance

- Agents get the input schema of their next step and document text inline, never a path to read
- The context command returns marked documents within the output budget
- The autopilot runs by default; Pause in the plan panel stops before the next task and Continue resumes
- An agent can install the Kit in a new folder with the user's git identity
- The app has no built-in project and works with an empty project list
- A new macOS package is built and published as a GitHub release

## Rounds

### R1 — Implementation (implementation, CLOSED)

- [DONE] A1 — Kit pause state (work)
  - Commit: feat: pause the workflow through the kit
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-pause.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-text.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-pause.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-status.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-pause.test.mjs
- [DONE] K1 — Input schema descriptors (work)
  - Commit: feat: describe kit inputs as schemas
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-execution.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-field-checks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-checks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-rounds.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-service-tasks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-transitions.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-validation.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-input-schema.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-apply.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-config.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-input-schema.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-input-schema.test.mjs
- [DONE] E1 — Real git config for agent processes (work)
  - Commit: fix: give agent processes the real git config
  - Files: product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/auth/claude-auth-runtime.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-acp-session-process.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-test-repo.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/module.md, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-auth-git-config.test.mjs, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/module.md, product-parts/provider-runtime/clusters/provider-adapters/modules/kimi-native-session/src/kimi-acp-session-transport.test.mjs, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/module.md, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.test.mjs, product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts
- [DONE] W1 — Core without a built-in project (work)
  - Commit: fix: remove the built-in project from core
  - Files: product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry, product-parts/core-runtime/clusters/session-runtime/modules/session-registry, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-localization-rebuild-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-identity.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-lifecycle.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-provider-lifecycle.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-facade.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workspace-rpc.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workspace-rpc.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-registry/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-registry/src/session-registry-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-registry/src/session-registry-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts, product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/module.md, product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.test.mjs, product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.ts
- [DONE] A2 — Autopilot on by default with a pause stop (work)
  - Commit: feat: run the autopilot by default and stop on pause
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/autopilot-decision.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-decision.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/src/workflow-autopilot-pause.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.ts
  - Depends on: A1
- [DONE] K2 — Kit schema command and packet schema (work)
  - Commit: feat: print input schemas and put them in the packet
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery, docs/architecture/workflow-kit/WorkflowKitCommands.md, docs/DOCUMENTATION_INDEX.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-schema.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-executor.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-schema.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-budget.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-schema.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-schema.test.mjs
  - Depends on: K1
- [DONE] A3 — Core pause route (work)
  - Commit: feat: route the workflow pause through core
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-identity.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-pause.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-pause.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-plan-view.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-watch.test.mjs
  - Depends on: A2, W1
- [DONE] K3 — Document text in executor briefs (work)
  - Commit: feat: put document text into executor briefs
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-context-budget.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-config.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-config.test.mjs
  - Depends on: K2
- [DONE] A4 — Pause bridge (work)
  - Commit: feat: bridge the workflow pause
  - Files: product-parts/application-shell/clusters/electron-host/modules/core-process-bridge, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/module.md, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/module.md, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.test.mjs
  - Depends on: A3
- [DONE] K4 — Recovery packet inline documents and map (work)
  - Commit: feat: keep required documents inline with a documents map
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-budget.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-documents.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-gather.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-model.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-documents.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-packet.test.mjs
  - Depends on: K3
- [DONE] A5 — Pause button in the plan panel (work)
  - Commit: feat: pause the plan from the plan panel
  - Files: product-parts/application-shell/clusters/project-workflow-ui, product-parts/application-shell/clusters/session-interface/modules/session-sidebar, product-parts/application-shell/clusters/session-interface/modules/session-window, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md, product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/module.md, product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel-facade.tsx, product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel.css, product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-panel.test.mjs, product-parts/application-shell/clusters/project-workflow-ui/modules/project-plan-panel/src/project-plan-pause-state.ts, product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/module.md, product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/src/workflow-status-state.ts, product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/src/workflow-status-strip-facade.tsx, product-parts/application-shell/clusters/project-workflow-ui/modules/workflow-status-strip/src/workflow-status-strip.test.mjs, product-parts/application-shell/clusters/project-workflow-ui/src/project-workflow-ui.css, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/module.md, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts
  - Depends on: A4
- [DONE] K5 — Kit context command (work)
  - Commit: feat: read documents through the kit context command
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-context.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context-command.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-context.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-executor.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-documents.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-documents.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts
  - Depends on: K4
- [DONE] W2 — Interface without a project (work)
  - Commit: fix: show the start screen without a project
  - Files: product-parts/application-shell/clusters/session-interface/modules/session-window, product-parts/application-shell/clusters/session-interface/modules/session-sidebar, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector, product-parts/core-runtime/clusters/session-runtime/modules/session-registry, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/module.md, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-markdown-content.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-start-screen.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-start-screen.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-workspaces.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts
  - Depends on: W1
- [DONE] K6 — Doctor doc-size and managed text 2.2.0 (work)
  - Commit: feat: check document sizes in doctor and update managed text
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-doctor.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-doctor.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs
  - Depends on: K5
- [DONE] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/ReleaseFixes-2026-11-04-3.md, .harness/product-tree/product-tree.json, .harness/product-tree/product-tree.md, docs/DOCUMENTATION_INDEX.md, docs/architecture/workflow-kit/WorkflowKit.md, docs/architecture/workflow-kit/WorkflowKitCommands.md, docs/architecture/workflow-kit/WorkflowKitCoreRpc.md, docs/architecture/workflow-kit/WorkflowKitExecutionModes.md, docs/architecture/workflow-kit/WorkflowKitInstallation.md, docs/architecture/workflow-kit/WorkflowKitOrchestration.md, docs/architecture/workflow-kit/WorkflowKitProcess.md, docs/architecture/workflow-kit/WorkflowKitQuality.md, docs/architecture/workflow-kit/WorkflowKitRecovery.md, product-parts/application-shell/clusters/project-workflow-ui/cluster.md, product-parts/application-shell/clusters/session-interface/cluster.md, product-parts/core-runtime/clusters/project-workflow/cluster.md, product-parts/core-runtime/clusters/session-runtime/cluster.md, product-parts/core-runtime/clusters/workspace-architecture/cluster.md, product-parts/core-runtime/product-part.md, product-parts/provider-runtime/clusters/provider-home-and-auth/cluster.md
  - Depends on: A1, K1, E1, W1, A2, K2, A3, K3, A4, K4, A5, K5, W2, K6
- [DONE] D1 — Package the macOS release (delivery)
  - Commit: chore: package release fixes round 3
  - Files: docs/evidence/release-fixes-3-package-2026-11-04.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: A1, K1, E1, W1, A2, K2, A3, K3, A4, K4, A5, K5, W2, K6, DOCS-R1
- [DONE] P1 — Publish the release on GitHub (delivery)
  - Commit: chore: publish release fixes round 3
  - Files: docs/evidence/release-fixes-3-publish-2026-11-04.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: D1, DOCS-R1

Digest: Agents now get Kit inputs and documents as text: `schema` descriptors (also in the recovery packet), document text in executor briefs, required documents always inline, the documents map and the `context` command, plus a doctor doc-size warning (Kit 2.2.0). The autopilot is on by default and the user pauses the plan from the plan panel (Kit pause state, Core pauseState). Agent processes see the real git config, and Core has no built-in project: the app opens on a start screen.

### R2 — Kit fixes 2026-11-05 (fixes, CLOSED)

- [DONE] F1 — Ignore dependency folders in the managed gitignore (work)
  - Commit: fix: ignore dependency folders in the managed gitignore block
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs
- [DONE] F2 — Skip ignored paths when staging a commit (work)
  - Commit: fix: skip ignored untracked paths when staging a kit commit
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-git, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-ignored-commit.test.mjs
- [DONE] F3 — Planned check ids in the quality module and the schema (work)
  - Commit: fix: define planned check ids and describe task checks honestly
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-runner.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/plan-input-schema.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/src/workflow-plan-input-schema.test.mjs
- [DONE] F4 — Refuse unknown task checks when planning (work)
  - Commit: fix: check task check ids in scope, extend and task update
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-scope.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-plan-checks.test.mjs
  - Depends on: F3
- [DONE] F5 — Cancel an assignment in the assignment module (work)
  - Commit: feat: cancel an assignment record with its worktree and branch
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-cancel.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-cleanup.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/assignment-records.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/src/workflow-assignment-cancel.test.mjs
- [DONE] F6 — assignment:cancel command (work)
  - Commit: feat: add the assignment:cancel command
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-assignment.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-args.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-assignment.test.mjs, docs/architecture/workflow-kit/WorkflowKitCommands.md
  - Depends on: F5
- [DONE] F7 — Cancel a changed commit preparation in repair (work)
  - Commit: fix: cancel a commit preparation whose index changed
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-git, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-repair.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-repair.test.mjs, docs/architecture/workflow-kit/WorkflowKitCommands.md
- [DONE] DOCS-R2 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R2
  - Files: README.md, docs/architecture/OVERVIEW.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-assignment/module.md, docs/DOCUMENTATION_INDEX.md, docs/architecture/KitFixes-2026-11-05.md, docs/architecture/workflow-kit/WorkflowKit.md, docs/architecture/workflow-kit/WorkflowKitCommands.md, docs/architecture/workflow-kit/WorkflowKitExecutionModes.md, docs/architecture/workflow-kit/WorkflowKitInstallation.md, docs/architecture/workflow-kit/WorkflowKitOrchestration.md, docs/architecture/workflow-kit/WorkflowKitProcess.md, docs/architecture/workflow-kit/WorkflowKitQuality.md, product-parts/core-runtime/clusters/project-workflow/cluster.md
  - Depends on: F1, F2, F3, F4, F5, F6, F7
- [DONE] D2 — Build the Workflow Kit bundle (delivery)
  - Commit: chore: build the workflow kit 2.2.1 bundle
  - Files: docs/evidence/kit-fixes-2026-11-05-bundle.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: DOCS-R2

Digest: Kit 2.2.1 fixes from the Workflow_Kit project: the managed .gitignore ignores node_modules/, .venv/ and __pycache__/; commit staging skips ignored paths outside the index, so removing a folder from the index commits; planning refuses tasks[].checks that are not quality check ids (CHECK_UNKNOWN); assignment:cancel drops a stuck assignment; repair --cancel restores a preparation whose index or plan changed while HEAD did not.

### R3 — Kit fixes 2026-11-05 (2) (fixes, OPEN)

- [DONE] F8 — Name the paths a commit candidate will not contain (work)
  - Commit: fix: name the paths absent from a commit candidate
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-transaction.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/workflow-git-transaction.test.mjs
- [DONE] F9 — Skip removed paths in content checks (work)
  - Commit: fix: skip paths removed by the commit in content checks
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-runner.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/workflow-quality-runner.test.mjs
  - Depends on: F8
- [TODO] F10 — Pass removed paths to the commit and prepare checks (work)
  - Commit: fix: do not check files a commit removes from the index
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-hooks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-task.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-ignored-commit.test.mjs
  - Depends on: F8, F9
  - Fixes: F2
- [TODO] F11 — Raise the Kit version to 2.2.2 (work)
  - Commit: chore: raise the workflow kit version to 2.2.2
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs
  - Depends on: F10
- [TODO] DOCS-R3 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R3
  - Files: README.md, docs/architecture/OVERVIEW.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md
  - Depends on: F8, F9, F10, F11
- [TODO] D3 — Build the Workflow Kit 2.2.2 bundle (delivery)
  - Commit: chore: build the workflow kit 2.2.2 bundle
  - Files: docs/evidence/kit-fixes-2026-11-05-bundle-2.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: DOCS-R3

State changes only through `scripts/workflow` commands. History lives in Git.
