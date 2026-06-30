# Harness AI

Harness AI is a standalone Electron application for software-product development through a classic chat surface and a strict Product Part / Cluster / Module architecture tree.

This repository is intentionally new. CodeAI Hub is reference material only; Harness AI modules are written fresh under `product-parts/**`.

## Bootstrap Status

- Product tree source: `.harness/product-tree/product-tree.json`.
- Human projection: `.harness/product-tree/product-tree.md`.
- Active local plan: `.harness/plans/todo-plan.md`.
- Production code root: `product-parts/**`.

MVP starts with the workspace skeleton, then installs the local development harness, then implements the first runnable Electron session slice.

## Packaged App Rebuilds

Use `npm run package:mac` when a change must be tested in
`release/mac-arm64/Harness AI.app`. The script first runs
`scripts/stop-packaged-app-processes.mjs`, which stops only running processes
launched from this repository's packaged app path before rebuilding `app.asar`.
This prevents an already-running packaged Core from continuing to serve an old
runtime after the package has been rebuilt.
