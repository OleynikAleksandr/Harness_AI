# Harness AI — Architecture Overview

Harness AI is a standalone Electron application for software-product
development through a classic chat surface. The code follows a strict
Product Part / Cluster / Module tree (`.harness/product-tree/product-tree.md`);
every module owns its `module.md` and `src/**` and is reached through a
public facade.

## Product Parts

| Product Part | Role | Main clusters |
|---|---|---|
| `application-shell` | Electron window, preload bridge and React renderer. Displays Core read models and passes user input; never owns product truth. | `electron-host`, `session-interface`, `project-workflow-ui`, `settings-surface`, `profile-studio`, `browser-localization` |
| `core-runtime` | Out-of-process local authority: workspaces, sessions, settings, localization, profiles, capture and project workflow. | `runtime-process`, `workspace-architecture`, `session-runtime`, `session-profiles`, `profile-studio`, `project-workflow`, `settings-and-localization`, `universal-client`, `provider-network-capture` |
| `provider-runtime` | Provider adapters (Claude, Codex, Kimi, OpenRouter, GLM, local models, Grok), provider homes/auth, readiness and event normalisation. Composed by Core only. | `provider-registry`, `provider-readiness`, `provider-adapters`, `provider-home-and-auth`, `provider-events-and-translation` |

## Process Model

```text
Electron main (app-bootstrap, core-process-bridge)
  ├─ renderer (React)  ⇄ preload IPC ⇄ Electron main
  └─ Core process (ELECTRON_RUN_AS_NODE) ⇄ JSON-RPC over stdio
        ├─ session runtime → provider adapters → provider CLIs/SDKs
        └─ workflow host  → Workflow Kit bundle (workflow.mjs) per project
```

- The Electron host supervises one Core process and relays IPC channels to
  Core RPC methods (`core-process-bridge-facade.mjs`).
- Core publishes events (session, provider, `workflow:status` with the Core
  plan view, `workflow:autopilot`, `workflow:mode-choice`) that the
  renderer only displays. Core watches each Kit project's plan and local
  workflow state and publishes `workflow:status` without an open UI.
- At start the Core process reads the user's login-shell PATH once and
  merges it into its own, so provider processes, their tools and Kit
  commands find `node`, `git` and Homebrew tools when the app is started
  from Finder.

## Main Contracts

- **Core RPC** (`core-runtime-api.ts`): workspaces, sessions, settings,
  localization, profiles and project workflow methods (`workflow-*`). The
  workspace registry routes (`list/add/select/remove-workspace`) live in
  `core-workspace-rpc.ts`; removing a project forgets every app reference to
  it and never touches the project folder.
- **Provider contract** (`provider-adapter-contract`): session start/resume,
  turns, normalised events; `workspaceContext` carries the Workflow Kit
  recovery packet into the provider system prompt.
- **Workflow Kit** (`docs/architecture/workflow-kit/WorkflowKit.md`): one
  TypeScript cluster (`project-workflow`) that installs a development process
  into any project — plan, transactional task commits, bounded recovery,
  quality profile and Git hooks. The same code is bundled into
  `.harness/workflow/runtime/workflow.mjs` inside each project and runs
  without Harness from hooks and agent terminals.
- **Execution modes**
  (`docs/architecture/workflow-kit/WorkflowKitExecutionModes.md`): in a
  Harness project the agent proposes the scope (`scope:propose`) and the
  user picks `sequential` (one agent) or `orchestrated` on a Core-built
  card in the left sidebar, under the owner session's card; the choice
  turns on that session's autopilot. In `orchestrated` mode Claude subagent executors commit
  their task in their own git worktree and the orchestrator integrates each
  result into main with a checked two-parent commit
  (`docs/architecture/workflow-kit/WorkflowKitOrchestration.md`). Core
  builds the plan view for the sidebar and binds executor sessions to
  tasks by their working directory.
- **Autopilot**: Core continues a session to the next plan task (or the
  next orchestrator step) only on the Kit's decision (`autopilot:status`),
  within `autopilot.maxContinues`.
- **Git identity**: Kit commits need a real git name and email. When none
  is set, the New/Open Project dialog (and Project Doctor) asks for them
  once; Core runs the Kit `identity:set --global`, which validates and
  writes the global git config, and the dialog repeats the preparation
  (`docs/architecture/ReleaseFixes-2026-11-04-2.md`, section 1).

## Development Process Of This Repository

Harness AI itself is developed with the Workflow Kit: the plan is
`.harness/plans/todo-plan.md`, checks come from
`.harness/workflow/config.json`, and commits go through `scripts/workflow`.
The DOCS task of every round keeps this overview in line with the code.
