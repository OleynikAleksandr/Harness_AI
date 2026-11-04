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
  "revision": 135,
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
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md"
      ],
      "fixes": null,
      "id": "A5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
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
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery"
      ],
      "fixes": null,
      "id": "K5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
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
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality"
      ],
      "fixes": null,
      "id": "K6",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
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
        "docs/architecture/ReleaseFixes-2026-11-04-3.md"
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
      "commitMessage": "chore: package release fixes round 3",
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
        "K6",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-3-package-2026-11-04.md"
      ],
      "fixes": null,
      "id": "D1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
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
      "confirmation": null,
      "context": [],
      "dependencies": [
        "D1",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-3-publish-2026-11-04.md"
      ],
      "fixes": null,
      "id": "P1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Publish the release on GitHub",
      "why": "Every plan ends with a GitHub publication"
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: release-fixes-2026-11-04-3 (ACTIVE)
- Delivery: IN_PROGRESS
- Current task: none
- Progress: 11/17
- Revision: 135

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

### R1 — Implementation (implementation, OPEN)

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
- [TODO] A5 — Pause button in the plan panel (work)
  - Commit: feat: pause the plan from the plan panel
  - Files: product-parts/application-shell/clusters/project-workflow-ui, product-parts/application-shell/clusters/session-interface/modules/session-sidebar, product-parts/application-shell/clusters/session-interface/modules/session-window, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.test.mjs, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/module.md
  - Depends on: A4
- [TODO] K5 — Kit context command (work)
  - Commit: feat: read documents through the kit context command
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery
  - Depends on: K4
- [DONE] W2 — Interface without a project (work)
  - Commit: fix: show the start screen without a project
  - Files: product-parts/application-shell/clusters/session-interface/modules/session-window, product-parts/application-shell/clusters/session-interface/modules/session-sidebar, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector, product-parts/core-runtime/clusters/session-runtime/modules/session-registry, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/module.md, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/module.md, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-markdown-content.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-start-screen.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-start-screen.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.test.mjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-session-state.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-workspaces.ts, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window.css, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-snapshot-projector/src/session-snapshot-projector-facade.ts
  - Depends on: W1
- [TODO] K6 — Doctor doc-size and managed text 2.2.0 (work)
  - Commit: feat: check document sizes in doctor and update managed text
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality
  - Depends on: K5
- [TODO] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/ReleaseFixes-2026-11-04-3.md
  - Depends on: A1, K1, E1, W1, A2, K2, A3, K3, A4, K4, A5, K5, W2, K6
- [TODO] D1 — Package the macOS release (delivery)
  - Commit: chore: package release fixes round 3
  - Files: docs/evidence/release-fixes-3-package-2026-11-04.md
  - Depends on: A1, K1, E1, W1, A2, K2, A3, K3, A4, K4, A5, K5, W2, K6, DOCS-R1
- [TODO] P1 — Publish the release on GitHub (delivery)
  - Commit: chore: publish release fixes round 3
  - Files: docs/evidence/release-fixes-3-publish-2026-11-04.md
  - Depends on: D1, DOCS-R1

State changes only through `scripts/workflow` commands. History lives in Git.
