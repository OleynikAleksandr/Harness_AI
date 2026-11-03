# Harness AI Development TODO Plan

<!-- harness-plan-state:start -->
```json
{
  "schema": "harness-ai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "workflow-kit-2026-11-03",
  "branch": "main",
  "lastRecordedCommit": "self",
  "currentTaskId": "harness-ai.wk.p5.t1",
  "expectedCommitMessage": "feat: build bounded workflow recovery packets",
  "debt": null
}
```
<!-- harness-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `docs/architecture/workflow-kit/WorkflowKit.md` and its sibling specs (`WorkflowKitProcess.md`, `WorkflowKitRecovery.md`, `WorkflowKitQuality.md`, `WorkflowKitInstallation.md`).
- **Integration map:** `docs/evidence/WorkflowKitIntegrationMap.md`.
- **Documentation catalog:** `docs/DOCUMENTATION_INDEX.md`.
- **Architecture truth:** `.harness/product-tree/product-tree.json`.
- **Readable architecture projection:** `.harness/product-tree/product-tree.md`.
- **User mandate (2026-11-03):** full scope in one release, agent rules in English, Workflow Pilot projects unsupported, execute all microtasks sequentially without asking; record every autonomous decision in the user's Desktop file `Workflow Kit — журнал решений.md`.

## Execution Rules

- The active plan is the recovery owner for this workspace.
- Every implementation task has a paired `Git Commit: ...` line.
- A task row is a logical row and may wrap onto indented continuation lines.
- Each microtask touches no more than 3 functional source files plus their tests unless the row lists more.
- Product Part / Cluster / Module filesystem ownership is primary; every module exposes a facade class `src/<module>-facade.ts` with a singleton.
- Cluster `project-workflow` modules (except `workflow-host`) import nothing outside the cluster and no npm packages.
- Any source change updates every related Markdown document in the same commit.
- Scope closeout/archival is user-directed only.
- Quality gates run automatically on every commit and push; plans never include a separate gate-run task.
- Commit with `npm run plan:commit -- "<expected commit message>"` until phase 12 moves the repository onto the kit.

## Phase 1 - Specification (owner: Claude, updated: 2026-11-03)

1. [DONE] `harness-ai.wk.p1.t1` Write the Workflow Kit specification (`docs/architecture/workflow-kit/*.md`), the integration map evidence and the documentation index entries, and open this plan (scope: `docs/architecture/workflow-kit/**, docs/evidence/WorkflowKitIntegrationMap.md, docs/DOCUMENTATION_INDEX.md, .harness/plans/todo-plan.md`; expected commit: `docs: specify workflow kit cluster and open its plan`). Result: Completed in commit `docs: specify workflow kit cluster and open its plan`.
2. [DONE] Git Commit: `docs: specify workflow kit cluster and open its plan` (hash: self)

## Phase 2 - Platform And Plan Model (owner: Claude, updated: 2026-11-03)

3. [DONE] `harness-ai.wk.p2.t1` Create the `project-workflow` cluster (cluster.md, product tree json/md, core-runtime product-part.md) and the `workflow-platform` module: POSIX/OS path normalization and safety, atomic write with Windows retry, exclusive file lock; `WorkflowPlatformFacade` class + singleton and tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/**, cluster.md, product tree`; expected commit: `feat: add workflow kit platform paths and atomic files`). Result: Completed in commit `feat: add workflow kit platform paths and atomic files`.
4. [DONE] Git Commit: `feat: add workflow kit platform paths and atomic files` (hash: self)
5. [DONE] `harness-ai.wk.p2.t2` Extend `workflow-platform`: shell-free process runner with Windows `.cmd`/`.bat` handling and PATH/PATHEXT lookup, Node runtime resolution (env, local runtime file, PATH >= 22, OS paths), launcher texts for sh/cmd/ps1; tests with simulated platforms (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-platform/**`; expected commit: `feat: add cross-platform process runner and launchers`). Result: Completed in commit `feat: add cross-platform process runner and launchers`.
6. [DONE] Git Commit: `feat: add cross-platform process runner and launchers` (hash: self)
7. [DONE] `harness-ai.wk.p2.t3` Create the `workflow-plan` module: plan/scope/round/task model types and full validation (schema, ids, dependencies order and cycles, service task rules, delivery states); tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/**, product tree, cluster.md`; expected commit: `feat: add workflow plan model and validation`). Result: Completed in commit `feat: add workflow plan model and validation`.
8. [DONE] Git Commit: `feat: add workflow plan model and validation` (hash: self)
9. [DONE] `harness-ai.wk.p2.t4` Add plan document render/parse (JSON between `harness-workflow` markers + readable projection, projection tamper detection) and `WorkflowPlanFacade`; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/**`; expected commit: `feat: render and parse workflow plan documents`). Result: Completed in commit `feat: render and parse workflow plan documents`.
10. [DONE] Git Commit: `feat: render and parse workflow plan documents` (hash: self)
11. [DONE] `harness-ai.wk.p2.t5` Add plan transitions: scope create, task start/block/unblock, mark done, delivery state recompute, automatic QUALITY and DOCS service task insertion; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/**`; expected commit: `feat: add workflow plan transitions and service tasks`). Result: Completed in commit `feat: add workflow plan transitions and service tasks`.
12. [DONE] Git Commit: `feat: add workflow plan transitions and service tasks` (hash: self)
13. [DONE] `harness-ai.wk.p2.t6` Add rounds lifecycle: plan extend (new/open round, before, fixes link, DOCS deferral), round digest validation, accept, close, carryover; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-plan/**`; expected commit: `feat: add workflow plan rounds and acceptance lifecycle`). Result: Completed in commit `feat: add workflow plan rounds and acceptance lifecycle`.
14. [DONE] Git Commit: `feat: add workflow plan rounds and acceptance lifecycle` (hash: self)

## Phase 3 - Git And Transactions (owner: Claude, updated: 2026-11-03)

15. [DONE] `harness-ai.wk.p3.t1` Create the `workflow-git` module: git runner, working-tree changes, history with trailer parsing, identity check, `WorkflowGitFacade`; tests on temporary repositories (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/**, product tree, cluster.md`; expected commit: `feat: add workflow git runner and trailer history`). Result: Completed in commit `feat: add workflow git runner and trailer history`.
16. [DONE] Git Commit: `feat: add workflow git runner and trailer history` (hash: self)
17. [DONE] `harness-ai.wk.p3.t2` Add the commit transaction: journal, task file baseline/selection with excluded changes, candidate tree, trailers, failure rollback of plan and index, confirmation; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/**`; expected commit: `feat: add transactional workflow commits`). Result: Completed in commit `feat: add transactional workflow commits`.
18. [DONE] Git Commit: `feat: add transactional workflow commits` (hash: self)
19. [DONE] `harness-ai.wk.p3.t3` Add task-to-commit reference resolution and repair (finish/retry/cancel/projection/defer-docs with repair ids); tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/**`; expected commit: `feat: resolve workflow commit references and repair`). Result: Completed in commit `feat: resolve workflow commit references and repair`.
20. [DONE] Git Commit: `feat: resolve workflow commit references and repair` (hash: self)

## Phase 4 - Quality Profile (owner: Claude, updated: 2026-11-03)

21. [DONE] `harness-ai.wk.p4.t1` Create the `workflow-quality` module: config schema and defaults (`.harness/workflow/config.json`: quality, docs contracts, budgets, policy, autopilot) and `WorkflowQualityFacade`; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/**, product tree, cluster.md`; expected commit: `feat: add workflow quality configuration`). Result: Completed in commit `feat: add workflow quality configuration`.
22. [DONE] Git Commit: `feat: add workflow quality configuration` (hash: self)
23. [DONE] `harness-ai.wk.p4.t2` Add stack detection (manifests, lock files, package manager) and the ecosystem catalog (node, python, go, rust, dotnet, swift, jvm) producing proposals; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/**`; expected commit: `feat: detect project stacks and quality catalog`). Result: Completed in commit `feat: detect project stacks and quality catalog`.
24. [DONE] Git Commit: `feat: detect project stacks and quality catalog` (hash: self)
25. [DONE] `harness-ai.wk.p4.t3` Add the check runner (prepare/commit/push/delivery stages, `{files}` expansion, appliesTo, timeouts, evidence records) and built-in checks (`kit:file-lines`, `kit:doc-size`, `kit:docs-contracts`, `kit:md-links`); tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/**`; expected commit: `feat: run workflow quality checks and builtins`). Result: Completed in commit `feat: run workflow quality checks and builtins`.
26. [DONE] Git Commit: `feat: run workflow quality checks and builtins` (hash: self)
27. [DONE] `harness-ai.wk.p4.t4` Add `quality:apply` (validation, approved install commands, CONFIGURED state) and drift comparison; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/**`; expected commit: `feat: apply workflow quality profiles`). Result: Completed in commit `feat: apply workflow quality profiles`.
28. [DONE] Git Commit: `feat: apply workflow quality profiles` (hash: self)

## Phase 5 - Recovery And Autopilot Decision (owner: Claude, updated: 2026-11-03)

29. [IN_PROGRESS] `harness-ai.wk.p5.t1` Create the `workflow-recovery` module: section builders and priority budget assembly with references and no silent truncation; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/**, product tree, cluster.md`; expected commit: `feat: build bounded workflow recovery packets`).
30. [TODO] Git Commit: `feat: build bounded workflow recovery packets` (hash: TBD)
31. [TODO] `harness-ai.wk.p5.t2` Add `WorkflowRecoveryFacade`: text/json packets, session-start hook output per client with `HARNESS_WORKFLOW_RECOVERY=host` suppression, show-task/history helpers; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/**`; expected commit: `feat: add workflow recovery facade and session start hook`).
32. [TODO] Git Commit: `feat: add workflow recovery facade and session start hook` (hash: TBD)
33. [TODO] `harness-ai.wk.p5.t3` Create the `workflow-autopilot` module: pure continue/stop decision with all stop reasons and the continue turn text; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-autopilot/**, product tree, cluster.md`; expected commit: `feat: add workflow autopilot decision`).
34. [TODO] Git Commit: `feat: add workflow autopilot decision` (hash: TBD)

## Phase 6 - Cluster Facade, Hooks, CLI And Bundle (owner: Claude, updated: 2026-11-03)

35. [TODO] `harness-ai.wk.p6.t1` Create the `workflow-kit` cluster facade module: `WorkflowKitFacade` composing status, scope, extend, task, commit, docs commit, accept, close, carryover, block, repair and quality operations; tests on temporary repositories (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/**, product tree, cluster.md`; expected commit: `feat: add workflow kit cluster facade operations`).
36. [TODO] Git Commit: `feat: add workflow kit cluster facade operations` (hash: TBD)
37. [TODO] `harness-ai.wk.p6.t2` Add git hook handlers (pre-commit managed candidate + commit checks, commit-msg, post-commit, pre-push with DOCS and push checks); tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/**`; expected commit: `feat: enforce managed commits through workflow git hooks`).
38. [TODO] Git Commit: `feat: enforce managed commits through workflow git hooks` (hash: TBD)
39. [TODO] `harness-ai.wk.p6.t3` Add the CLI dispatcher entry (`workflow-kit-cli.ts`), argument parsing, JSON/text output, help, error envelope; knip entry; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/**, knip.json`; expected commit: `feat: add workflow kit command line`).
40. [TODO] Git Commit: `feat: add workflow kit command line` (hash: TBD)
41. [TODO] `harness-ai.wk.p6.t4` Bundle the CLI into `dist/workflow-kit/workflow.mjs` (second Vite SSR config, `scripts/build-workflow-kit.mjs`, build and dev chain) and smoke-test the bundle end to end in a temporary repository (scope: `vite.workflow-kit.config.ts, scripts/build-workflow-kit.mjs, package.json, scripts/dev-electron.mjs`; expected commit: `build: bundle the workflow kit for projects`).
42. [TODO] Git Commit: `build: bundle the workflow kit for projects` (hash: TBD)

## Phase 7 - Installer And Doctor (owner: Claude, updated: 2026-11-03)

43. [TODO] `harness-ai.wk.p7.t1` Create the `workflow-installer` module: English agent rules (AGENTS managed section), CLAUDE line, provider hook JSON merges, git hook sections, launchers, gitignore/gitattributes sections, skeleton docs, manifest model; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/**, product tree, cluster.md`; expected commit: `feat: generate workflow kit installation payload`).
44. [TODO] Git Commit: `feat: generate workflow kit installation payload` (hash: TBD)
45. [TODO] `harness-ai.wk.p7.t2` Add folder inspection (all states incl. legacy Harness plan and Workflow Pilot) and install/update with git init, hooks path, bootstrap transaction; `WorkflowInstallerFacade`; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/**`; expected commit: `feat: inspect folders and install the workflow kit`).
46. [TODO] Git Commit: `feat: inspect folders and install the workflow kit` (hash: TBD)
47. [TODO] `harness-ai.wk.p7.t3` Add the project doctor and safe fixes with kit-update commit; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/**`; expected commit: `feat: add workflow kit project doctor`).
48. [TODO] Git Commit: `feat: add workflow kit project doctor` (hash: TBD)
49. [TODO] `harness-ai.wk.p7.t4` Add `migrate:harness-plan` (legacy rows to legacy digest round and new tasks, kind markers, acceptance mapping); tests with a fixture of the legacy format (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/**`; expected commit: `feat: migrate harness plans into the workflow kit`).
50. [TODO] Git Commit: `feat: migrate harness plans into the workflow kit` (hash: TBD)

## Phase 8 - Core Host, Electron And RPC (owner: Claude, updated: 2026-11-03)

51. [TODO] `harness-ai.wk.p8.t1` Create the `workflow-host` module: bundle and runtime resolution, async child-process command runner with JSON protocol and timeouts, runtime file writing; tests (scope: `product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/**, product tree, cluster.md`; expected commit: `feat: run workflow kit commands from core`).
52. [TODO] Git Commit: `feat: run workflow kit commands from core` (hash: TBD)
53. [TODO] `harness-ai.wk.p8.t2` Electron host: ship the bundle via extraResources, pass bundle/Electron runtime env to Core, add project folder/parent pickers to the bridge and preload; tests (scope: `core-process-supervisor.mjs, core-process-bridge-facade.mjs, preload.cjs, package.json`; expected commit: `feat: ship workflow kit bundle and project folder pickers`).
54. [TODO] Git Commit: `feat: ship workflow kit bundle and project folder pickers` (hash: TBD)
55. [TODO] `harness-ai.wk.p8.t3` Core RPC `core-project-workflow-rpc.ts` (inspect, prepare-project, status, doctor) wired into `CoreRuntimeApi` with `workflow:status` events; tests (scope: `core-runtime-process/src/**`; expected commit: `feat: expose project workflow rpc in core`).
56. [TODO] Git Commit: `feat: expose project workflow rpc in core` (hash: TBD)

## Phase 9 - Provider Context Delivery (owner: Claude, updated: 2026-11-03)

57. [TODO] `harness-ai.wk.p9.t1` Add `ProviderSessionStartOptions.workspaceContext` and compute the recovery packet in `bindProviderSession` for workspaces with the kit; tests (scope: `provider-adapter-contract, session-request-handler`; expected commit: `feat: pass workflow recovery context to provider sessions`).
58. [TODO] Git Commit: `feat: pass workflow recovery context to provider sessions` (hash: TBD)
59. [TODO] `harness-ai.wk.p9.t2` Claude adapter: append workspace context to native/managed/legacy prompts and pass `HARNESS_WORKFLOW_RECOVERY=host`; tests (scope: `claude-provider/src/**`; expected commit: `feat: deliver workflow context to claude sessions`).
60. [TODO] Git Commit: `feat: deliver workflow context to claude sessions` (hash: TBD)
61. [TODO] `harness-ai.wk.p9.t3` Codex adapter: `developerInstructions` on thread start/resume and `HARNESS_WORKFLOW_RECOVERY=host` in the app-server env; tests (scope: `codex-provider/src/**`; expected commit: `feat: deliver workflow context to codex sessions`).
62. [TODO] Git Commit: `feat: deliver workflow context to codex sessions` (hash: TBD)
63. [TODO] `harness-ai.wk.p9.t4` Client providers (OpenRouter, GLM, Local Models, Kimi-client): leading system message with the workspace context; tests (scope: `*-client-provider/src/**`; expected commit: `feat: deliver workflow context to client providers`).
64. [TODO] Git Commit: `feat: deliver workflow context to client providers` (hash: TBD)

## Phase 10 - Core Autopilot (owner: Claude, updated: 2026-11-03)

65. [TODO] `harness-ai.wk.p10.t1` Add `session-workflow-autopilot.ts` in session-request-handler: after turn completion decide and send the continue turn with a fresh packet, skip guards (stop, failure, interaction, subagent, creator), loop protection; tests (scope: `session-request-handler/src/**`; expected commit: `feat: continue workflow tasks automatically in core`).
66. [TODO] Git Commit: `feat: continue workflow tasks automatically in core` (hash: TBD)
67. [TODO] `harness-ai.wk.p10.t2` Autopilot RPC (`workflow-autopilot-set/get`) and `workflow:autopilot` events; tests (scope: `core-runtime-process/src/**`; expected commit: `feat: control workflow autopilot through rpc`).
68. [TODO] Git Commit: `feat: control workflow autopilot through rpc` (hash: TBD)

## Phase 11 - Project Workflow UI (owner: Claude, updated: 2026-11-03)

69. [TODO] `harness-ai.wk.p11.t1` Extract workspace state and actions from `session-window-facade.tsx` into a dedicated hook file without behavior change; tests (scope: `session-window/src/**`; expected commit: `refactor: extract session window workspace state`).
70. [TODO] Git Commit: `refactor: extract session window workspace state` (hash: TBD)
71. [TODO] `harness-ai.wk.p11.t2` Renderer typings and event guards for the project workflow API and events, localization source strings; tests (scope: `session-window/src/vite-env.d.ts, session-window-core-events.ts, source-dictionaries`; expected commit: `feat: type project workflow core api in renderer`).
72. [TODO] Git Commit: `feat: type project workflow core api in renderer` (hash: TBD)
73. [TODO] `harness-ai.wk.p11.t3` Create Application Shell cluster `project-workflow-ui` with `project-setup-dialog` (New Project parent+name, Open Project with inspect result and install); tests (scope: `application-shell/clusters/project-workflow-ui/**, product tree`; expected commit: `feat: add new and open project dialog`).
74. [TODO] Git Commit: `feat: add new and open project dialog` (hash: TBD)
75. [TODO] `harness-ai.wk.p11.t4` Add `project-doctor-panel` (checks, statuses, fix action); tests (scope: `application-shell/clusters/project-workflow-ui/**`; expected commit: `feat: add project doctor panel`).
76. [TODO] Git Commit: `feat: add project doctor panel` (hash: TBD)
77. [TODO] `harness-ai.wk.p11.t5` Add `workflow-status-strip` (scope, task, progress, autopilot toggle and stop reason); tests (scope: `application-shell/clusters/project-workflow-ui/**`; expected commit: `feat: show workflow status and autopilot controls`).
78. [TODO] Git Commit: `feat: show workflow status and autopilot controls` (hash: TBD)
79. [TODO] `harness-ai.wk.p11.t6` Wire New Project / Open Project / Project Doctor into the sidebar menu and mount dialogs and strip in the session window; tests (scope: `session-sidebar, session-window, session-surface`; expected commit: `feat: wire project workflow ui into the session window`).
80. [TODO] Git Commit: `feat: wire project workflow ui into the session window` (hash: TBD)

## Phase 12 - Move Harness AI Onto The Kit (owner: Claude, updated: 2026-11-03)

81. [TODO] `harness-ai.wk.p12.t1` Run `migrate:harness-plan` on this repository: install the kit (hook sections in `.husky`), convert this plan, commit through the kit transaction (this row closes via the migration commit, not plan:commit) (scope: `whole repository workflow files`; expected commit: `chore: move harness ai onto the workflow kit`).
82. [TODO] Git Commit: `chore: move harness ai onto the workflow kit` (hash: TBD)
83. [TODO] `harness-ai.wk.p12.t2` Apply the Harness quality profile and docs contracts through the kit (kind: quality) (scope: `.harness/workflow/config.json`; expected commit: `chore: apply harness quality profile`).
84. [TODO] Git Commit: `chore: apply harness quality profile` (hash: TBD)
85. [TODO] `harness-ai.wk.p12.t3` Rewrite AGENTS.md/CLAUDE.md around the kit section, update the index and plan template, remove `scripts/plan.mjs`, `scripts/check-docs-sync.mjs`, their tests and `plan:*` scripts (scope: `AGENTS.md, CLAUDE.md, docs/DOCUMENTATION_INDEX.md, scripts/**, package.json`; expected commit: `chore: retire legacy plan scripts`).
86. [TODO] Git Commit: `chore: retire legacy plan scripts` (hash: TBD)

## Phase 13 - Documentation, Package And Acceptance (owner: Claude, updated: 2026-11-03)

87. [TODO] `harness-ai.wk.p13.t1` Reconcile README, product part/cluster docs, product tree and architecture docs with the delivered kit (kind: docs) (scope: `README.md, product-parts/**/*.md, docs/**`; expected commit: `docs: reconcile project documentation for the workflow kit`).
88. [TODO] Git Commit: `docs: reconcile project documentation for the workflow kit` (hash: TBD)
89. [TODO] `harness-ai.wk.p13.t2` Package the macOS app (`npm run package:mac`, confirmed by the user's release request) and record evidence (kind: delivery) (scope: `docs/evidence/**`; expected commit: `chore: package workflow kit release`).
90. [TODO] Git Commit: `chore: package workflow kit release` (hash: TBD)

## Final Acceptance

91. [TODO] `harness-ai.wk.p13.t3` User verifies the packaged release (completion: user-acceptance; scope: user workflow; expected commit: none).
