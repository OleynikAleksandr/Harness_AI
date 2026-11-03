# Workflow Plan — harness-ai

<!-- harness-workflow:begin -->
```json
{
  "currentTaskId": null,
  "lastClosed": null,
  "projectId": "harness-ai",
  "projectName": "harness-ai",
  "revision": 10,
  "rounds": [
    {
      "digest": {
        "contracts": [],
        "decisions": [],
        "references": [
          "git show 910532c1d4007da6fda92ca942fd087680b8341d:.harness/plans/todo-plan.md"
        ],
        "result": "Legacy plan workflow-kit-2026-11-03: 41 tasks were done before the move to the Workflow Kit (harness-ai.wk.p1.t1 … harness-ai.wk.p12.t1). Their rows stay in the plan of the parent commit of the migration."
      },
      "id": "R0-legacy",
      "kind": "legacy",
      "status": "CLOSED",
      "title": "Legacy plan workflow-kit-2026-11-03"
    },
    {
      "digest": {
        "contracts": [
          "AGENTS.md: English project rules plus the managed Workflow Kit section",
          ".harness/workflow/config.json: Harness quality profile and module.md docs contracts",
          "docs/architecture/OVERVIEW.md: product parts, process model and main contracts"
        ],
        "decisions": [
          "Legacy plan.mjs, check-docs-sync and their npm scripts removed; AGENTS.md project rules rewritten in English around the managed Kit section.",
          "Kit bundle excluded from Biome, the architecture line limit and jscpd; policy.maxFileLines left null because check-architecture enforces 500 lines.",
          "DOCUMENTATION_INDEX.md split: the evidence catalog moved to docs/evidence/EVIDENCE_INDEX.md and EVIDENCE_INDEX_2.md to meet the 28 KB document budget.",
          "The legacy todo-plan.template.md stays as a historical file because .harness/plans/** is Kit-managed."
        ],
        "references": [
          "docs/architecture/workflow-kit/WorkflowKit.md",
          "docs/architecture/workflow-kit/WorkflowKitInstallation.md",
          "docs/architecture/workflow-kit/WorkflowKitQuality.md#9"
        ],
        "result": "Workflow Kit 2.0 delivered as the Core project-workflow cluster (plan, transactional commits, recovery, quality profile, installer, doctor, autopilot, host) with Core RPC, provider workspace context and the New/Open Project, Doctor and status-strip UI; Harness AI itself now runs on the Kit with the Harness quality profile."
      },
      "id": "R1",
      "kind": "implementation",
      "status": "CLOSED",
      "title": "Remaining work"
    }
  ],
  "schema": "harness-workflow-plan/1",
  "scope": {
    "acceptance": [
      "The user accepts the delivered result"
    ],
    "acceptanceNote": {
      "at": "2026-11-03T17:41:00.164Z",
      "text": "Да, принять и закрыть — сборка от 2026-11-03 принята как база для тестирования; дефекты, недоделки и развитие — в новый план."
    },
    "approval": {
      "at": "2026-11-03T17:20:06.404Z",
      "text": "Migrated from the legacy plan workflow-kit-2026-11-03 by migrate:harness-plan."
    },
    "baselineCommit": "910532c1d4007da6fda92ca942fd087680b8341d",
    "blockedReason": null,
    "context": [
      {
        "path": "docs/architecture/workflow-kit/WorkflowKit.md",
        "required": false
      },
      {
        "path": "docs/evidence/WorkflowKitIntegrationMap.md",
        "required": false
      },
      {
        "path": "docs/DOCUMENTATION_INDEX.md",
        "required": false
      },
      {
        "path": ".harness/product-tree/product-tree.json",
        "required": false
      },
      {
        "path": ".harness/product-tree/product-tree.md",
        "required": false
      }
    ],
    "decisions": [
      {
        "at": "2026-11-03T17:20:06.404Z",
        "text": "Migration: harness-ai.wk.p13.t3 → the user's acceptance through `accept`."
      },
      {
        "at": "2026-11-03T17:20:06.404Z",
        "text": "Migration: harness-ai.wk.p13.t1 → DOCS-R1."
      }
    ],
    "delivery": "ACCEPTED",
    "id": "workflow-kit-2026-11-03",
    "objective": "Finish the remaining work of workflow-kit-2026-11-03.",
    "spec": "docs/architecture/workflow-kit/WorkflowKit.md",
    "status": "ACTIVE"
  },
  "tasks": [
    {
      "acceptance": [
        "Apply the Harness quality profile and docs contracts through the kit"
      ],
      "checks": [],
      "commitMessage": "chore: apply harness quality profile",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        ".harness/workflow/config.json"
      ],
      "fixes": null,
      "id": "harness-ai.wk.p12.t2",
      "iteration": 1,
      "kind": "quality",
      "roundId": "R1",
      "status": "DONE",
      "title": "Apply the Harness quality profile and docs contracts through the kit",
      "why": "Migrated from Phase 12 - Move Harness AI Onto The Kit (owner: Claude, updated: 2026-11-03); legacy scope: `.harness/workflow/config.json`."
    },
    {
      "acceptance": [
        "Rewrite AGENTS.md/CLAUDE.md around the kit section, update the index and plan template, remove `scripts/plan.mjs`, `scripts/check-docs-sync.mjs`, their tests and `plan:*` scripts"
      ],
      "checks": [],
      "commitMessage": "chore: retire legacy plan scripts",
      "confirmation": null,
      "context": [],
      "dependencies": [],
      "docsWaiver": null,
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        "README.md",
        "biome.jsonc",
        "docs/DOCUMENTATION_INDEX.md",
        "docs/evidence/EVIDENCE_INDEX.md",
        "docs/evidence/EVIDENCE_INDEX_2.md",
        "package.json",
        "scripts/check-architecture.mjs",
        "scripts/check-docs-sync.mjs",
        "scripts/check-docs-sync.test.mjs",
        "scripts/plan-accept.test.mjs",
        "scripts/plan-archive.test.mjs",
        "scripts/plan-multiline.test.mjs",
        "scripts/plan.mjs"
      ],
      "fixes": null,
      "id": "harness-ai.wk.p12.t3",
      "iteration": 1,
      "kind": "work",
      "roundId": "R1",
      "status": "DONE",
      "title": "Rewrite AGENTS.md/CLAUDE.md around the kit section, update the index and plan template, remove `scripts/plan.mjs`, `scripts/check-docs-sync.mjs`, their tests and `plan:*` scripts",
      "why": "Migrated from Phase 12 - Move Harness AI Onto The Kit (owner: Claude, updated: 2026-11-03); legacy scope: `AGENTS.md, CLAUDE.md, docs/DOCUMENTATION_INDEX.md, scripts/**, package.json`."
    },
    {
      "acceptance": [
        "Project-wide documents describe the round result",
        "The round digest records result, decisions, contracts and references"
      ],
      "checks": [],
      "commitMessage": "docs: reconcile project documentation for the workflow kit",
      "confirmation": null,
      "context": [],
      "dependencies": [
        "harness-ai.wk.p12.t2",
        "harness-ai.wk.p12.t3"
      ],
      "docsWaiver": null,
      "files": [
        "README.md",
        "docs/architecture/CodexCacheAnchorThread.md",
        "docs/architecture/OVERVIEW.md",
        "docs/architecture/ProfileCompilationAndBenchmarking.md"
      ],
      "fixes": null,
      "id": "DOCS-R1",
      "iteration": 1,
      "kind": "docs",
      "roundId": "R1",
      "status": "DONE",
      "title": "Reconcile README, product part/cluster docs, product tree and architecture docs with the delivered kit",
      "why": "Keep the project context current for the next agent and close the round."
    },
    {
      "acceptance": [
        "Package the macOS app (`npm run package:mac`, confirmed by the user's release request) and record evidence"
      ],
      "checks": [],
      "commitMessage": "chore: package workflow kit release",
      "confirmation": "User request 2026-11-03: implement the Workflow Kit through to a new release build; 'Я жду готового нового релиза.'",
      "context": [],
      "dependencies": [
        "DOCS-R1"
      ],
      "docsWaiver": null,
      "files": [
        "docs/evidence/EVIDENCE_INDEX_2.md",
        "docs/evidence/workflow-kit-release-package-2026-11-03.md"
      ],
      "fixes": null,
      "id": "harness-ai.wk.p13.t2",
      "iteration": 1,
      "kind": "delivery",
      "roundId": "R1",
      "status": "DONE",
      "title": "Package the macOS app (`npm run package:mac`, confirmed by the user's release request) and record evidence",
      "why": "Migrated from Phase 13 - Documentation, Package And Acceptance (owner: Claude, updated: 2026-11-03); legacy scope: `docs/evidence/**`."
    }
  ]
}
```
<!-- harness-workflow:end -->

## State

- Scope: workflow-kit-2026-11-03 (ACTIVE)
- Delivery: ACCEPTED
- Current task: none
- Progress: 4/4
- Revision: 10

## Objective

Finish the remaining work of workflow-kit-2026-11-03.

## Acceptance

- The user accepts the delivered result

## Rounds

### R0-legacy — Legacy plan workflow-kit-2026-11-03 (legacy, CLOSED)


Digest: Legacy plan workflow-kit-2026-11-03: 41 tasks were done before the move to the Workflow Kit (harness-ai.wk.p1.t1 … harness-ai.wk.p12.t1). Their rows stay in the plan of the parent commit of the migration.

### R1 — Remaining work (implementation, CLOSED)

- [DONE] harness-ai.wk.p12.t2 — Apply the Harness quality profile and docs contracts through the kit (quality)
  - Commit: chore: apply harness quality profile
  - Files: .harness/workflow/config.json
- [DONE] harness-ai.wk.p12.t3 — Rewrite AGENTS.md/CLAUDE.md around the kit section, update the index and plan template, remove `scripts/plan.mjs`, `scripts/check-docs-sync.mjs`, their tests and `plan:*` scripts (work)
  - Commit: chore: retire legacy plan scripts
  - Files: AGENTS.md, CLAUDE.md, README.md, biome.jsonc, docs/DOCUMENTATION_INDEX.md, docs/evidence/EVIDENCE_INDEX.md, docs/evidence/EVIDENCE_INDEX_2.md, package.json, scripts/check-architecture.mjs, scripts/check-docs-sync.mjs, scripts/check-docs-sync.test.mjs, scripts/plan-accept.test.mjs, scripts/plan-archive.test.mjs, scripts/plan-multiline.test.mjs, scripts/plan.mjs
- [DONE] DOCS-R1 — Reconcile README, product part/cluster docs, product tree and architecture docs with the delivered kit (docs)
  - Commit: docs: reconcile project documentation for the workflow kit
  - Files: README.md, docs/architecture/CodexCacheAnchorThread.md, docs/architecture/OVERVIEW.md, docs/architecture/ProfileCompilationAndBenchmarking.md
  - Depends on: harness-ai.wk.p12.t2, harness-ai.wk.p12.t3
- [DONE] harness-ai.wk.p13.t2 — Package the macOS app (`npm run package:mac`, confirmed by the user's release request) and record evidence (delivery)
  - Commit: chore: package workflow kit release
  - Files: docs/evidence/EVIDENCE_INDEX_2.md, docs/evidence/workflow-kit-release-package-2026-11-03.md
  - Depends on: DOCS-R1

Digest: Workflow Kit 2.0 delivered as the Core project-workflow cluster (plan, transactional commits, recovery, quality profile, installer, doctor, autopilot, host) with Core RPC, provider workspace context and the New/Open Project, Doctor and status-strip UI; Harness AI itself now runs on the Kit with the Harness quality profile.

State changes only through `scripts/workflow` commands. History lives in Git.
