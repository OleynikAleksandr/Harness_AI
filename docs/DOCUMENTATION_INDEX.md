# Harness AI Documentation Index

This is the navigation entrypoint for tracked Harness AI Markdown
documentation. It is a catalog, not a requirement to read everything.

Use this index with:

- `.harness/plans/todo-plan.md` — active recovery owner and current scope.
- `.harness/product-tree/product-tree.md` — readable Product Part / Cluster /
  Module map.

## Session Start

At the beginning of a session, read `.harness/plans/todo-plan.md`, run
`npm run plan:status`, then use this index only to choose the documents
relevant to the active task.

## Canonical Instructions

- `AGENTS.md` — primary agent instructions, architecture rules, plan lifecycle,
  gates, documentation sync requirements and release/package rules.
- `CLAUDE.md` — Claude workspace instruction entrypoint.
- `README.md` — project overview and user/developer orientation.

## Recovery And Product Tree

- `.harness/plans/todo-plan.md` — active execution scope and recovery owner.
- `.harness/plans/todo-plan.template.md` — template for a new active scope.
- `.harness/plans/archive/*.md` — archived closed-scope plans; historical only.
- `.harness/product-tree/product-tree.md` — readable product tree projection.

## Architecture

- `docs/architecture/CodeAIHubProviderRuntimeAlignment.md` — CodeAI-Hub
  provider-runtime migration map and provider alignment contract.
- `docs/architecture/FirstElectronSessionSlice.md` — first Electron session
  slice architecture.
- `docs/architecture/NextSessionMode.md` — Core-owned next-session mode
  contract and UI display boundary.
- `docs/architecture/ProjectManagerSettingsParity.md` — Project Manager
  settings parity contract.
- `docs/architecture/ReferenceCoreRuntimeBoundary.md` — out-of-process Core,
  Application Shell boundary, regression preservation and guard contract.

## Product Part Documentation

Every Product Part, Cluster and Module owns its local Markdown contract:

- `product-parts/*/product-part.md` — Product Part purpose, owned clusters,
  responsibilities and out-of-scope boundary.
- `product-parts/*/clusters/*/cluster.md` — Cluster boundary, owned modules
  and facade/ownership rules.
- `product-parts/*/clusters/*/modules/*/module.md` — Module responsibility,
  public facade, inputs, outputs and owned paths.

These files are code-adjacent contracts. When behavior, ownership, facade
surface, process boundary, provider semantics, UI display contract or runtime
state changes, update every affected product-part/cluster/module document in
the same commit.

## Evidence

- `docs/evidence/*.md` — verification notes for completed slices, packaging,
  provider migration, UI fixes, runtime behavior, smoke checks and retests.

Evidence documents are not the source of truth for future behavior. They are
proof of what was checked in a specific scope. When a new verification slice is
added, add a new evidence file and keep this index entry valid.

## Documentation Catalog Rule

This index covers all tracked Markdown documentation either by explicit path or
by glob. When adding, moving or deleting a tracked `.md` / `.markdown` file,
update this index in the same commit.
