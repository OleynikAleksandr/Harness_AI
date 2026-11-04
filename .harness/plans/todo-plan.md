# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-03T17:41:08.520Z",
    "scopeId": "workflow-kit-2026-11-03"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 12,
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
      "Claude background subagents stream their text while they run and end with their real status",
      "Right-click on a project in the project list offers Remove from Harness AI, which removes every app reference to it without touching the project folder",
      "A new macOS package is built and verified"
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-04T07:40:47.959Z",
      "text": "User 2026-11-04: 'Если согласен, исправляй эту ошибку. Собирай новый релиз.' plus 'возможность убирать из списков проект ... по правой клавише мыши'."
    },
    "baselineCommit": "21d80e2eb32e1e8cc02b531795cba78110664aba",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      }
    ],
    "decisions": [],
    "delivery": "IN_PROGRESS",
    "id": "release-fixes-2026-11-04",
    "objective": "Fix Claude async subagent observation (live text, real terminal status) and let the user remove a project from the app through a right-click menu; ship a new macOS release.",
    "spec": "docs/architecture/ReleaseFixes-2026-11-04.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "async_launched is not terminal",
        "task-notification sets the terminal status",
        "polling continues after the parent turn while background agents run",
        "closeSession stops polling"
      ],
      "checks": [],
      "commitMessage": "fix: follow claude async subagents to their real end",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-files.ts",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-observer.ts",
        "product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/provider/claude-provider-adapter.ts"
      ],
      "fixes": null,
      "id": "F1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Observe Claude async subagents to their real end",
      "why": "async_launched was read as a terminal failure and polling stopped with the parent turn"
    },
    {
      "acceptance": [
        "releaseWorkspaceSessions closes bindings and drops records of that workspace only",
        "deleteSession behaves as before"
      ],
      "checks": [],
      "commitMessage": "feat: release workspace sessions from core",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-tree-release.ts"
      ],
      "fixes": null,
      "id": "F2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Release the sessions of a workspace from Core memory",
      "why": "Removing a project must close its provider sessions and drop its records without deleting history files"
    },
    {
      "acceptance": [
        "removeWorkspaceResidue deletes only the slug directories of that path under the app provider homes"
      ],
      "checks": [],
      "commitMessage": "feat: remove provider home residue of a workspace",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts"
      ],
      "fixes": null,
      "id": "F3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Remove app-home provider residue of a workspace",
      "why": "Global provider homes keep per-project Claude directories keyed by the project path"
    },
    {
      "acceptance": [
        "remove-workspace removes the registry entry, releases sessions, removes residue and falls back to the built-in workspace",
        "the built-in workspace is refused"
      ],
      "checks": [],
      "commitMessage": "feat: add core route to remove a workspace",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "F2",
        "F3"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workspace-rpc.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts"
      ],
      "fixes": null,
      "id": "F4",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Core remove-workspace route",
      "why": "Core owns the workspace registry; the API file is at its line limit"
    },
    {
      "acceptance": [
        "window.harness.removeWorkspace(workspaceId) reaches Core remove-workspace"
      ],
      "checks": [],
      "commitMessage": "feat: bridge workspace removal to the renderer",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "F4"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts"
      ],
      "fixes": null,
      "id": "F5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Bridge remove-workspace to the renderer",
      "why": "The renderer reaches Core only through the preload bridge"
    },
    {
      "acceptance": [
        "right click on a project opens an in-app menu whose first item removes it",
        "the item is absent for the built-in workspace",
        "the list and active project follow the Core answer"
      ],
      "checks": [],
      "commitMessage": "feat: remove a project from the project list menu",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "F5"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx"
      ],
      "fixes": null,
      "id": "F6",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Project list context menu with Remove from Harness AI",
      "why": "The user removes test projects from the list by right click"
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
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/ReleaseFixes-2026-11-04.md"
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
        "release/mac-arm64/Harness AI.app rebuilt and smoke-checked"
      ],
      "checks": [],
      "commitMessage": "chore: package release fixes 2026-11-04",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "F6",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-package-2026-11-04.md"
      ],
      "fixes": null,
      "id": "F7",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Package the macOS release and record evidence",
      "why": "The user checks fixes in the packaged app"
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: release-fixes-2026-11-04 (ACTIVE)
- Delivery: IN_PROGRESS
- Current task: none
- Progress: 0/8
- Revision: 12

## Objective

Fix Claude async subagent observation (live text, real terminal status) and let the user remove a project from the app through a right-click menu; ship a new macOS release.

## Acceptance

- Claude background subagents stream their text while they run and end with their real status
- Right-click on a project in the project list offers Remove from Harness AI, which removes every app reference to it without touching the project folder
- A new macOS package is built and verified

## Rounds

### R1 — Implementation (implementation, OPEN)

- [TODO] F1 — Observe Claude async subagents to their real end (work)
  - Commit: fix: follow claude async subagents to their real end
  - Files: product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-files.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/subagents/claude-subagent-observer.ts, product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/provider/claude-provider-adapter.ts
- [TODO] F2 — Release the sessions of a workspace from Core memory (work)
  - Commit: feat: release workspace sessions from core
  - Files: product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-tree-release.ts
- [TODO] F3 — Remove app-home provider residue of a workspace (work)
  - Commit: feat: remove provider home residue of a workspace
  - Files: product-parts/provider-runtime/clusters/provider-home-and-auth/modules/provider-home-manager/src/provider-home-manager-facade.ts
- [TODO] F4 — Core remove-workspace route (work)
  - Commit: feat: add core route to remove a workspace
  - Files: product-parts/core-runtime/clusters/workspace-architecture/modules/workspace-registry/src/workspace-registry-facade.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workspace-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-api.ts
  - Depends on: F2, F3
- [TODO] F5 — Bridge remove-workspace to the renderer (work)
  - Commit: feat: bridge workspace removal to the renderer
  - Files: product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts
  - Depends on: F4
- [TODO] F6 — Project list context menu with Remove from Harness AI (work)
  - Commit: feat: remove a project from the project list menu
  - Files: product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/workspace-menu.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-sidebar-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx
  - Depends on: F5
- [TODO] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/ReleaseFixes-2026-11-04.md
  - Depends on: F1, F2, F3, F4, F5, F6
- [TODO] F7 — Package the macOS release and record evidence (delivery)
  - Commit: chore: package release fixes 2026-11-04
  - Files: docs/evidence/release-fixes-package-2026-11-04.md
  - Depends on: F6, DOCS-R1

State changes only through `scripts/workflow` commands. History lives in Git.
