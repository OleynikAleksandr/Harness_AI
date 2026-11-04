# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-04T12:19:23.951Z",
    "scopeId": "execution-modes-2026-11-04"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 84,
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
      "A missing or placeholder git identity is entered once in an in-app form, validated by the Kit and the preparation continues",
      "Open Project asks no project name",
      "The execution mode card is shown in the left sidebar under the owner session in the interface language",
      "Choosing a mode runs the plan to its end through the autopilot",
      "Agent processes find node and other login-shell tools",
      "A new macOS package is built and published as a GitHub release"
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-04T12:22:48.596Z",
      "text": "User 2026-11-04: 'Предлагаю на этом пока остановиться и исправить то, что уже было найдено. Закрывай текущий скоп, создавай новую спецификацию to-do plan вплоть до сборки нового релиза. И в принципе можно его опубликовать на GitHub - https://github.com/OleynikAleksandr/Harness_AI И, включая этот пункт, последним в каждой из последующих план.'"
    },
    "baselineCommit": "88a63c65701c9a122438d8788f465d3a274eff91",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/architecture/workflow-kit/WorkflowKitExecutionModes.md",
        "required": false
      },
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      }
    ],
    "decisions": [],
    "delivery": "IN_PROGRESS",
    "id": "release-fixes-2026-11-04-2",
    "objective": "Fix the defects found in the execution modes release (git identity form instead of terminal commands, Open Project without a name field, the mode card in the sidebar, localized new strings, the mode choice starting execution, the login-shell PATH, small Kit fixes), build the macOS release and publish it on GitHub.",
    "spec": "docs/architecture/ReleaseFixes-2026-11-04-2.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "identity:set validates and writes the global identity (GIT_IDENTITY_PLACEHOLDER, GIT_IDENTITY_INVALID)",
        "GIT_IDENTITY_REQUIRED names the problem once; commands only in nextAction"
      ],
      "checks": [],
      "commitMessage": "feat: set and validate git identity through the kit",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-identity.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-identity.ts"
      ],
      "fixes": null,
      "id": "G1",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Kit identity:set and identity validation",
      "why": "The identity must be set without a terminal, quoted emails were accepted and the refusal text repeated the commands"
    },
    {
      "acceptance": [
        "workflow-identity-set calls Kit identity:set and returns its result",
        "prepare-project can be repeated after the identity is set"
      ],
      "checks": [],
      "commitMessage": "feat: route git identity through core",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "G1"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts"
      ],
      "fixes": null,
      "id": "G2",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Core identity route",
      "why": "Core passes the form values to the Kit and continues the preparation"
    },
    {
      "acceptance": [
        "setGitIdentity reaches Core workflow-identity-set"
      ],
      "checks": [],
      "commitMessage": "feat: bridge the git identity route",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "G2"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs",
        "product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts"
      ],
      "fixes": null,
      "id": "G3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Bridge for the identity route",
      "why": "The renderer reaches Core only through the bridge"
    },
    {
      "acceptance": [
        "GIT_IDENTITY_REQUIRED opens the name and email form and the preparation continues after saving",
        "Open Project shows no name field",
        "the doctor git-identity failure opens the same form"
      ],
      "checks": [],
      "commitMessage": "feat: ask the git identity in the setup dialog",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "G3"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-setup-dialog/src/project-setup-dialog-facade.tsx",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-setup-dialog/src/project-setup-actions.ts",
        "product-parts/application-shell/clusters/project-workflow-ui/modules/project-doctor-panel/src/project-doctor-panel-facade.tsx"
      ],
      "fixes": null,
      "id": "G4",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Setup dialog identity form and no name in Open Project",
      "why": "The user enters the identity once in the app; an existing folder already names the project"
    },
    {
      "acceptance": [
        "the card renders under the owner session card in the sidebar where the plan appears after the choice",
        "the dialog area no longer shows it"
      ],
      "checks": [],
      "commitMessage": "feat: show the mode card in the sidebar",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/application-shell/clusters/project-workflow-ui/modules/execution-mode-card/src/execution-mode-card-facade.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.tsx",
        "product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx"
      ],
      "fixes": null,
      "id": "G5",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Mode card in the left sidebar",
      "why": "The choice belongs next to the plan under the owner session, not in the dialog"
    },
    {
      "acceptance": [
        "card, plan panel, autopilot reasons and setup strings appear in the interface language",
        "the translated bundle is refreshed when new source keys appear"
      ],
      "checks": [],
      "commitMessage": "fix: localize the new workflow strings",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "G4",
        "G5"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts",
        "product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts"
      ],
      "fixes": null,
      "id": "G6",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Localize the new interface strings",
      "why": "The card mixed English labels with Russian descriptions"
    },
    {
      "acceptance": [
        "choosing sequential or orchestrated turns on the owner session autopilot",
        "the autopilot still stops on acceptance, block, delivery confirmation and waiting for executors"
      ],
      "checks": [],
      "commitMessage": "fix: start plan execution on the mode choice",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.ts",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.test.mjs",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.test.mjs",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md",
        "product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.test.mjs"
      ],
      "fixes": null,
      "id": "G7",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Mode choice enables the autopilot",
      "why": "After choosing sequential the agent stopped after one task"
    },
    {
      "acceptance": [
        "Core merges the login-shell PATH once at start with a timeout",
        "provider processes and Kit commands from Core inherit it; failure keeps the old PATH with a diagnostic"
      ],
      "checks": [],
      "commitMessage": "fix: give agent processes the login shell path",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-login-path.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-entry.ts",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md",
        "product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-login-path.test.mjs"
      ],
      "fixes": null,
      "id": "G8",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Login-shell PATH for agent processes",
      "why": "The app started from Finder has no /opt/homebrew/bin and Kit checks could not find node"
    },
    {
      "acceptance": [
        "the managed .gitignore lists .DS_Store and installed projects get it on update",
        "kit:conflict-markers refuses staged conflict markers",
        "check:dup:workspace ignores .harness/workflow/local/**"
      ],
      "checks": [],
      "commitMessage": "fix: small workflow kit defects from the release check",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts",
        "package.json"
      ],
      "fixes": null,
      "id": "G9",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "TODO",
      "title": "Small Kit fixes: DS_Store, conflict markers, dup ignore",
      "why": "Test runs left .DS_Store changes, conflict markers slipped into a commit and Kit local state broke the duplication check"
    },
    {
      "acceptance": [
        "LICENSE holds the same MIT text and copyright line as the GitHub repository"
      ],
      "checks": [],
      "commitMessage": "chore: add the MIT license",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "LICENSE"
      ],
      "fixes": null,
      "id": "G10",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "MIT LICENSE as on GitHub",
      "why": "The first publication replaces GitHub's initial commit and must keep its license"
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
        "G1",
        "G2",
        "G3",
        "G4",
        "G5",
        "G6",
        "G7",
        "G8",
        "G9",
        "G10"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/ReleaseFixes-2026-11-04-2.md"
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
      "commitMessage": "chore: package release fixes round 2",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "G6",
        "G7",
        "G8",
        "G9",
        "G10",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-2-package-2026-11-04.md"
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
        "main is pushed to origin, tag vYYYY.M.D created",
        "a GitHub Release with the digest and the app zip exists"
      ],
      "checks": [],
      "commitMessage": "chore: publish release fixes round 2",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "D1",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/release-fixes-2-publish-2026-11-04.md"
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

- Scope: release-fixes-2026-11-04-2 (ACTIVE)
- Delivery: IN_PROGRESS
- Current task: none
- Progress: 3/13
- Revision: 84

## Objective

Fix the defects found in the execution modes release (git identity form instead of terminal commands, Open Project without a name field, the mode card in the sidebar, localized new strings, the mode choice starting execution, the login-shell PATH, small Kit fixes), build the macOS release and publish it on GitHub.

## Acceptance

- A missing or placeholder git identity is entered once in an in-app form, validated by the Kit and the preparation continues
- Open Project asks no project name
- The execution mode card is shown in the left sidebar under the owner session in the interface language
- Choosing a mode runs the plan to its end through the autopilot
- Agent processes find node and other login-shell tools
- A new macOS package is built and published as a GitHub release

## Rounds

### R1 — Implementation (implementation, OPEN)

- [TODO] G1 — Kit identity:set and identity validation (work)
  - Commit: feat: set and validate git identity through the kit
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-git/src/git-identity.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-install.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/kit-cli-identity.ts
- [TODO] G2 — Core identity route (work)
  - Commit: feat: route git identity through core
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-host/src/workflow-host-facade.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts
  - Depends on: G1
- [TODO] G3 — Bridge for the identity route (work)
  - Commit: feat: bridge the git identity route
  - Files: product-parts/application-shell/clusters/electron-host/modules/core-process-bridge/src/core-process-bridge-facade.mjs, product-parts/application-shell/clusters/electron-host/modules/app-bootstrap/src/preload.cjs, product-parts/application-shell/clusters/session-interface/modules/session-window/src/vite-env.d.ts
  - Depends on: G2
- [TODO] G4 — Setup dialog identity form and no name in Open Project (work)
  - Commit: feat: ask the git identity in the setup dialog
  - Files: product-parts/application-shell/clusters/project-workflow-ui/modules/project-setup-dialog/src/project-setup-dialog-facade.tsx, product-parts/application-shell/clusters/project-workflow-ui/modules/project-setup-dialog/src/project-setup-actions.ts, product-parts/application-shell/clusters/project-workflow-ui/modules/project-doctor-panel/src/project-doctor-panel-facade.tsx
  - Depends on: G3
- [TODO] G5 — Mode card in the left sidebar (work)
  - Commit: feat: show the mode card in the sidebar
  - Files: product-parts/application-shell/clusters/project-workflow-ui/modules/execution-mode-card/src/execution-mode-card-facade.tsx, product-parts/application-shell/clusters/session-interface/modules/session-sidebar/src/session-tree.tsx, product-parts/application-shell/clusters/session-interface/modules/session-window/src/session-window-facade.tsx
- [TODO] G6 — Localize the new interface strings (work)
  - Commit: fix: localize the new workflow strings
  - Files: product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/source-dictionaries.ts, product-parts/core-runtime/clusters/settings-and-localization/modules/localization-runtime/src/localization-runtime-facade.ts
  - Depends on: G4, G5
- [DONE] G7 — Mode choice enables the autopilot (work)
  - Commit: fix: start plan execution on the mode choice
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.ts, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.test.mjs, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-project-workflow-rpc.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-workflow-mode-choice.test.mjs, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/module.md, product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-workflow-autopilot.test.mjs
- [DONE] G8 — Login-shell PATH for agent processes (work)
  - Commit: fix: give agent processes the login shell path
  - Files: product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-login-path.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-runtime-process-entry.ts, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/module.md, product-parts/core-runtime/clusters/runtime-process/modules/core-runtime-process/src/core-login-path.test.mjs
- [TODO] G9 — Small Kit fixes: DS_Store, conflict markers, dup ignore (work)
  - Commit: fix: small workflow kit defects from the release check
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-quality/src/quality-builtins.ts, package.json
- [DONE] G10 — MIT LICENSE as on GitHub (work)
  - Commit: chore: add the MIT license
  - Files: LICENSE
- [TODO] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/ReleaseFixes-2026-11-04-2.md
  - Depends on: G1, G2, G3, G4, G5, G6, G7, G8, G9, G10
- [TODO] D1 — Package the macOS release (delivery)
  - Commit: chore: package release fixes round 2
  - Files: docs/evidence/release-fixes-2-package-2026-11-04.md
  - Depends on: G6, G7, G8, G9, G10, DOCS-R1
- [TODO] P1 — Publish the release on GitHub (delivery)
  - Commit: chore: publish release fixes round 2
  - Files: docs/evidence/release-fixes-2-publish-2026-11-04.md
  - Depends on: D1, DOCS-R1

State changes only through `scripts/workflow` commands. History lives in Git.
