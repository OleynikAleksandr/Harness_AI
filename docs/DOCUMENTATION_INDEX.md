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

Application Shell browser localization docs live under
`product-parts/application-shell/clusters/browser-localization/**` and follow
the same cluster/module contract.

These files are code-adjacent contracts. When behavior, ownership, facade
surface, process boundary, provider semantics, UI display contract or runtime
state changes, update every affected product-part/cluster/module document in
the same commit.

Provider readiness docs are part of this product documentation tree under
`product-parts/provider-runtime/clusters/provider-readiness/**`, including the
readiness registry, liveness checker, and workspace provisioner modules.

## Evidence

- `docs/evidence/*.md` — verification notes for completed slices, packaging,
  provider migration, UI fixes, runtime behavior, smoke checks and retests.
- `docs/evidence/localization-transfer-2026-06-30.md` — localization transfer
  implementation evidence before packaged application verification.
- `docs/evidence/localization-transfer-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for the localization transfer scope.
- `docs/evidence/localization-ui-repair-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for the interface localization repair.
- `docs/evidence/localization-coverage-cache-repair-packaged-app-2026-06-30.md`
  — packaged application rebuild evidence for Settings localization coverage and
  cache layout repair.
- `docs/evidence/localization-refresh-repair-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for refreshing the open Settings
  localization payload after save/reset.
- `docs/evidence/localization-open-refresh-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for refreshing Settings localization
  payload when the dialog opens.
- `docs/evidence/localization-select-dirty-packaged-app-2026-06-30.md` —
  packaged application rebuild evidence for native Settings select dirty-state
  repair.
- `docs/evidence/core-settings-diagnostics-package-2026-06-30.md` — packaged
  application rebuild evidence for Core-owned settings diagnostics logs.
- `docs/evidence/core-restart-failure-package-2026-06-30.md` — packaged
  application rebuild evidence for Core restart failure handling in Settings.
- `docs/evidence/settings-save-responsiveness-package-2026-06-30.md` —
  packaged application rebuild evidence for Settings Save responsiveness after
  localization category changes.
- `docs/evidence/blocking-localization-refresh-package-2026-06-30.md` —
  packaged application rebuild evidence for reference-style blocking
  localization refresh feedback after Settings Save.
- `docs/evidence/packaged-app-process-cleanup-2026-06-30.md` — package script
  evidence for stopping stale packaged Harness AI app/Core processes before
  rebuilding `app.asar`.
- `docs/evidence/settings-full-app-restart-package-2026-06-30.md` — packaged
  application rebuild evidence for replacing Settings restart with full Electron
  app relaunch.
- `docs/evidence/app-relaunch-core-shutdown-package-2026-06-30.md` — packaged
  application rebuild evidence for stopping Core before Electron app relaunch.
- `docs/evidence/localization-runtime-payload-ipc-package-2026-06-30.md` —
  packaged application rebuild evidence for forwarding the browser localization
  runtime payload IPC through the Electron Core process bridge.
- `docs/evidence/remaining-settings-localization-package-2026-06-30.md` —
  packaged application rebuild evidence for remaining Settings localization
  coverage, dynamic OpenRouter description translation, and localization cache
  invalidation by source dictionary fingerprint.
- `docs/evidence/sonnet-alias-description-package-2026-06-30.md` — packaged
  application rebuild evidence for removing the stale concrete Claude Sonnet
  model id from Settings helper copy.
- `docs/evidence/reasoning-translation-prefix-package-2026-07-01.md` —
  packaged application rebuild evidence for translated reasoning prefix
  stability in growing provider streams.
- `docs/evidence/reasoning-translation-reveal-package-2026-07-01.md` —
  packaged application rebuild evidence for preventing translated reasoning
  reveal animation from restarting on growing batches.
- `docs/evidence/openrouter-translation-engines-package-2026-07-01.md` —
  packaged application rebuild evidence for the OpenRouter-backed UI/Reasoning
  Translation Engine options in General Settings.
- `docs/evidence/localization-bundle-cache-engine-key-package-2026-07-01.md` —
  packaged application rebuild evidence for invalidating the localization
  bundle cache when the translation engine changes.
- `docs/evidence/localization-glossary-open-file-package-2026-07-01.md` —
  packaged application rebuild evidence for fixing the Settings "Open glossary
  file" action to create and open the real Core-owned do-not-translate
  glossary file instead of a nonexistent workspace path.
- `docs/evidence/localization-rebuild-translations-package-2026-07-01.md` —
  packaged application rebuild evidence for the Settings "Rebuild
  translations" action that forces retranslation ignoring the localization
  bundle cache, plus the related `CoreRuntimeApi` provider lifecycle split.
- `docs/evidence/localization-glossary-copy-reasoning-terminology-package-2026-07-01.md`
  — packaged application rebuild evidence for correcting stale CodeAI Hub
  glossary example terms and rewording "bubble" to "message" in reasoning
  description copy for cleaner machine translation.
- `docs/evidence/localization-glossary-preferred-translation-package-2026-07-01.md`
  — packaged application rebuild evidence for glossary
  `Term - Desired translation` entries, wired through the existing
  `GlossaryProtector` preferred-translation engine via a new wildcard target
  language.

Evidence documents are not the source of truth for future behavior. They are
proof of what was checked in a specific scope. When a new verification slice is
added, add a new evidence file and keep this index entry valid.

## Documentation Catalog Rule

This index covers all tracked Markdown documentation either by explicit path or
by glob. When adding, moving or deleting a tracked `.md` / `.markdown` file,
update this index in the same commit.
