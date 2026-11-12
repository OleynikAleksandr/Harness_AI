# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": {
    "closedAt": "2026-11-12T13:22:49.925Z",
    "scopeId": "release-fixes-2026-11-04-3"
  },
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 196,
  "rounds": [
    {
      "digest": {
        "contracts": [
          "workflow-recovery/module.md: PART_LIMIT, MAX_PARTS, packetParts(text, count) → {parts, needed}, parsePart, sessionStart(root, {client, stdin, env, part?}).",
          "workflow-kit/module.md: sessionStart(root, client, stdin, part?); hook session-start --client claude|codex [--part K/N].",
          "workflow-installer/module.md: six Claude SessionStart groups with --part K/6, the Codex entry with additionalContextLimit 65536, the managed part is the array of every Kit group, KIT_VERSION 2.2.3, the new session-start rule."
        ],
        "decisions": [
          "Claude Code keeps at most 10 000 UTF-16 units of one hook's output and has no setting for it, so the packet is cut into parts, one hook per part (six, up to 57 000 units).",
          "Codex has a per-hook additionalContextLimit, so it keeps one hook with the whole packet.",
          "Parts are cut at sections, then lines, then characters without breaking a surrogate pair; the part line carries a digest of the whole text so an agent can tell parts of one packet.",
          "A wrong --part or a missing part gives an answer without additionalContext and exit code 0: a hook never blocks the session.",
          "WorkflowKitInstallation.md section 3 moved to WorkflowKitPlanMigration.md to keep the document within the size limit; the --part details live in WorkflowKitCommands.md, the workflow-kit module.md keeps the summary."
        ],
        "references": [
          "docs/architecture/KitRecoveryParts-2026-11-12.md",
          "docs/architecture/workflow-kit/WorkflowKitRecovery.md",
          "docs/architecture/workflow-kit/WorkflowKitInstallation.md",
          "docs/architecture/workflow-kit/WorkflowKitPlanMigration.md",
          "docs/architecture/workflow-kit/WorkflowKitCommands.md"
        ],
        "result": "Kit 2.2.3: the SessionStart hook delivers the whole recovery packet in one turn. Claude gets six hooks hook session-start --client claude --part K/6, each with one part of at most 9500 UTF-16 units that starts with the part K/N line (revision, head, digest); Codex gets one hook with additionalContextLimit 65536. A packet that needs more parts says so and points to recover; the managed AGENTS.md rule tells agents to run recover unless every part with one digest is in the context."
      },
      "id": "R1",
      "kind": "implementation",
      "status": "OPEN",
      "title": "Implementation"
    }
  ],
  "schema": "harness-workflow-plan/1",
  "scope": {
    "acceptance": [
      "A new Claude session gets every packet part inline, each part at most 9500 UTF-16 units with one digest",
      "A new Codex session gets the whole packet through one hook with additionalContextLimit",
      "install --update moves a 2.2.2 project to the new hook entries and keeps foreign hooks",
      "dist/workflow-kit/workflow.mjs reports KIT_VERSION 2.2.3",
      "The macOS app is packaged and the release is published on GitHub"
    ],
    "acceptanceNote": null,
    "approval": {
      "at": "2026-11-12T13:24:59.647Z",
      "text": "User 2026-11-12: «Давай исправим Claude и Codex, а с кими будем разбираться потом. Подготовь спецификацию и план для реализации этих исправлений в… Harness AI. И выполни и пересобери новый релиз… Harness AI, а потом и нашего Workflow Kit»; «Я все принимаю. Дальше делай все как положено»."
    },
    "baselineCommit": "94f47763a7aecd4ebe3d3a4e42ed080d4f6a2ab0",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/architecture/KitRecoveryParts-2026-11-12.md",
        "required": true
      }
    ],
    "decisions": [
      {
        "at": "2026-11-12T13:24:59.647Z",
        "text": "Claude: six SessionStart groups with --part K/6, part limit 9500 UTF-16 units"
      },
      {
        "at": "2026-11-12T13:24:59.647Z",
        "text": "Codex: one hook entry with additionalContextLimit 65536"
      },
      {
        "at": "2026-11-12T13:24:59.647Z",
        "text": "Kimi is out of scope"
      },
      {
        "at": "2026-11-12T13:24:59.647Z",
        "text": "The user confirms nothing in provider apps"
      }
    ],
    "delivery": "IN_PROGRESS",
    "id": "kit-recovery-parts-2026-11-12",
    "objective": "Deliver the whole recovery packet in one turn for Claude and Codex: packet parts within the Claude hook limit, hook session-start --part K/N, six Claude hook groups and the Codex additionalContextLimit, the new session-start rule; build the Workflow Kit 2.2.3 bundle, package and publish the release.",
    "spec": "docs/architecture/KitRecoveryParts-2026-11-12.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "packetParts splits by sections, then lines, then characters without breaking a surrogate pair; every part is at most PART_LIMIT",
        "Every part starts with the part K/N line with revision, head and digest; parts without their first lines join to the packet",
        "A packet that needs more parts ends the last part with the Packet incomplete line",
        "sessionStart with a part returns that part, or no additionalContext when the part does not exist or in host mode",
        "Tests and module.md"
      ],
      "checks": [],
      "commitMessage": "feat(workflow-recovery): split the session-start packet into parts",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitRecoveryParts-2026-11-12.md",
          "heading": "2. Части пакета (`workflow-recovery`)",
          "required": true
        }
      ],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-parts.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-commands.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-parts.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md"
      ],
      "fixes": null,
      "id": "T001",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Recovery packet parts",
      "why": "Claude Code persists hook output over 10000 characters and shows the agent a 2 KB preview"
    },
    {
      "acceptance": [
        "--part K/N with 1 <= K <= N <= 16 prints that part",
        "An invalid --part prints no additionalContext, a stderr line and exits 0",
        "Without --part the whole packet is printed as in 2.2.2",
        "Tests and module.md"
      ],
      "checks": [],
      "commitMessage": "feat(workflow-kit): add --part to hook session-start",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitRecoveryParts-2026-11-12.md",
          "heading": "3. CLI (`workflow-kit`)",
          "required": true
        }
      ],
      "dependencies": [
        "T001"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "docs/architecture/workflow-kit/WorkflowKitCommands.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.test.mjs"
      ],
      "fixes": null,
      "id": "T002",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "hook session-start --part",
      "why": "Each Claude hook group asks for its own part"
    },
    {
      "acceptance": [
        "Claude settings get six SessionStart groups with --part K/6; Codex hooks get one entry with additionalContextLimit 65536",
        "All old Kit groups are replaced, foreign groups and settings stay",
        "inspect and doctor compare every Kit group",
        "The managed AGENTS.md section has the new session-start rule",
        "KIT_VERSION is 2.2.3",
        "Tests and module.md"
      ],
      "checks": [],
      "commitMessage": "feat(workflow-installer): install recovery hooks in parts and raise the Codex limit",
      "confirmation": null,
      "context": [
        {
          "path": "docs/architecture/KitRecoveryParts-2026-11-12.md",
          "heading": "4. Установщик (`workflow-installer`)",
          "required": true
        }
      ],
      "dependencies": [
        "T002"
      ],
      "docsWaiver": null,
      "files": [
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-provider-hooks.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs"
      ],
      "fixes": null,
      "id": "T003",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Installer: hook groups, Codex limit, session-start rule",
      "why": "Projects get the six Claude groups, the Codex limit and the rule about an incomplete packet"
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
        "T001",
        "T002",
        "T003"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/KitRecoveryParts-2026-11-12.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md",
        "product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md",
        "docs/architecture/workflow-kit/WorkflowKitInstallation.md",
        "docs/architecture/workflow-kit/WorkflowKitPlanMigration.md",
        "docs/architecture/workflow-kit/WorkflowKitRecovery.md",
        "docs/architecture/workflow-kit/WorkflowKit.md",
        "docs/DOCUMENTATION_INDEX.md"
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
        "npm run build:workflow-kit succeeds and dist/workflow-kit/workflow.mjs reports KIT_VERSION 2.2.3",
        "A smoke run on a temporary project shows six Claude groups and the Codex entry with additionalContextLimit; install --update rewrites a 2.2.2 project",
        "hook session-start --part K/6 on a long packet gives parts of at most 9500 characters",
        "A live Codex run confirms the unit of additionalContextLimit with a packet of about 60 KB",
        "Evidence in docs/evidence/kit-recovery-parts-2026-11-12-bundle.md"
      ],
      "checks": [],
      "commitMessage": "chore: build the workflow kit 2.2.3 bundle",
      "confirmation": "Пользователь 2026-11-12: «И выполни и пересобери новый релиз… Harness AI, а потом и нашего Workflow Kit»; «Я все принимаю. Дальше делай все как положено.»",
      "context": [],
      "dependencies": [
        "T003",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "dist/workflow-kit/workflow.mjs",
        "docs/evidence/kit-recovery-parts-2026-11-12-bundle.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "D1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "DONE",
      "title": "Build the Workflow Kit 2.2.3 bundle",
      "why": "Build the Workflow Kit 2.2.3 bundle"
    },
    {
      "acceptance": [
        "npm run package:mac succeeds and release/mac-arm64/Harness AI.app exists"
      ],
      "checks": [],
      "commitMessage": "chore: package the workflow kit 2.2.3 release",
      "confirmation": "Пользователь 2026-11-12: «И выполни и пересобери новый релиз… Harness AI»; «Я все принимаю. Дальше делай все как положено.»",
      "context": [],
      "dependencies": [
        "D1",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/kit-recovery-parts-2026-11-12-package.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "D2",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "DONE",
      "title": "Package the macOS release",
      "why": "Package the macOS release"
    },
    {
      "acceptance": [
        "the history passes the secret scan",
        "main is pushed to origin and tag v2026.11.12 created",
        "a GitHub Release with the digest and the app zip exists"
      ],
      "checks": [],
      "commitMessage": "chore: publish the workflow kit 2.2.3 release",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "D2",
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/kit-recovery-parts-2026-11-12-publish.md",
        "docs/evidence/EVIDENCE_INDEX_2.md"
      ],
      "fixes": null,
      "id": "P1",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "TODO",
      "title": "Publish the release on GitHub",
      "why": "Publish the release on GitHub"
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: kit-recovery-parts-2026-11-12 (ACTIVE)
- Delivery: IN_PROGRESS
- Current task: none
- Progress: 6/7
- Revision: 196

## Objective

Deliver the whole recovery packet in one turn for Claude and Codex: packet parts within the Claude hook limit, hook session-start --part K/N, six Claude hook groups and the Codex additionalContextLimit, the new session-start rule; build the Workflow Kit 2.2.3 bundle, package and publish the release.

## Acceptance

- A new Claude session gets every packet part inline, each part at most 9500 UTF-16 units with one digest
- A new Codex session gets the whole packet through one hook with additionalContextLimit
- install --update moves a 2.2.2 project to the new hook entries and keeps foreign hooks
- dist/workflow-kit/workflow.mjs reports KIT_VERSION 2.2.3
- The macOS app is packaged and the release is published on GitHub

## Rounds

### R1 — Implementation (implementation, OPEN)

- [DONE] T001 — Recovery packet parts (work)
  - Commit: feat(workflow-recovery): split the session-start packet into parts
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-parts.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/recovery-commands.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/src/workflow-recovery-parts.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md
- [DONE] T002 — hook session-start --part (work)
  - Commit: feat(workflow-kit): add --part to hook session-start
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-facade.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, docs/architecture/workflow-kit/WorkflowKitCommands.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/src/workflow-kit-cli.test.mjs
  - Depends on: T001
- [DONE] T003 — Installer: hook groups, Codex limit, session-start rule (work)
  - Commit: feat(workflow-installer): install recovery hooks in parts and raise the Codex limit
  - Files: product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-provider-hooks.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-payload.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/installer-texts.ts, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-install.test.mjs, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/src/workflow-installer-payload.test.mjs
  - Depends on: T002
- [DONE] DOCS-R1 — Reconcile project documentation and write the round digest (docs)
  - Commit: docs: reconcile documentation for R1
  - Files: README.md, docs/architecture/OVERVIEW.md, docs/architecture/KitRecoveryParts-2026-11-12.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-recovery/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-kit/module.md, product-parts/core-runtime/clusters/project-workflow/modules/workflow-installer/module.md, docs/architecture/workflow-kit/WorkflowKitInstallation.md, docs/architecture/workflow-kit/WorkflowKitPlanMigration.md, docs/architecture/workflow-kit/WorkflowKitRecovery.md, docs/architecture/workflow-kit/WorkflowKit.md, docs/DOCUMENTATION_INDEX.md
  - Depends on: T001, T002, T003
- [DONE] D1 — Build the Workflow Kit 2.2.3 bundle (delivery)
  - Commit: chore: build the workflow kit 2.2.3 bundle
  - Files: dist/workflow-kit/workflow.mjs, docs/evidence/kit-recovery-parts-2026-11-12-bundle.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: T003, DOCS-R1
- [DONE] D2 — Package the macOS release (delivery)
  - Commit: chore: package the workflow kit 2.2.3 release
  - Files: docs/evidence/kit-recovery-parts-2026-11-12-package.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: D1, DOCS-R1
- [TODO] P1 — Publish the release on GitHub (delivery)
  - Commit: chore: publish the workflow kit 2.2.3 release
  - Files: docs/evidence/kit-recovery-parts-2026-11-12-publish.md, docs/evidence/EVIDENCE_INDEX_2.md
  - Depends on: D2, DOCS-R1

Digest: Kit 2.2.3: the SessionStart hook delivers the whole recovery packet in one turn. Claude gets six hooks hook session-start --client claude --part K/6, each with one part of at most 9500 UTF-16 units that starts with the part K/N line (revision, head, digest); Codex gets one hook with additionalContextLimit 65536. A packet that needs more parts says so and points to recover; the managed AGENTS.md rule tells agents to run recover unless every part with one digest is in the context.

State changes only through `scripts/workflow` commands. History lives in Git.
