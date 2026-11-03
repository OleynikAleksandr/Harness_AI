# Workflow Kit release package — 2026-11-03

Scope: `workflow-kit-2026-11-03`, delivery task `harness-ai.wk.p13.t2`.
Source commit: `014ba6e1` (`docs: reconcile project documentation for the
workflow kit`). Confirmation: the user's request for a new release build.

## Build

- `npm run package:mac` → exit 0 (typecheck, runtime build,
  `build:workflow-kit`, Vite renderer build, `electron-builder --mac dir`).
- Electron 42.5.0, arm64, unsigned (`identity: null`), default icon.
- Artifact: `release/mac-arm64/Harness AI.app`; `Contents/Resources/app.asar`
  32.9 MB; `Contents/Resources/workflow-kit/workflow.mjs` 223 KB (the same
  bundle as `dist/workflow-kit/workflow.mjs`).
- `app.asar` contains the new modules (`workflow-host`,
  `core-project-workflow-rpc`, `project-setup-dialog` and siblings).

## Smoke checks on the packaged binary

- `ELECTRON_RUN_AS_NODE=1 "Harness AI" workflow.mjs inspect <missing folder>`
  → `state: MISSING`, `action: create`.
- `... workflow.mjs install <folder> --name "Smoke Project"` → `ok`, bootstrap
  commit `chore: install workflow kit 2.0.0`; launchers `scripts/workflow`,
  `.cmd`, `.ps1`; `.harness/workflow/{config,manifest}.json`, hooks, bundle.
- In the new project: `scripts/workflow status` → `scope: NONE`, quality
  `DISCOVERY`; `scripts/workflow doctor` → `ok: true`.
- `... workflow.mjs status --root <harness-ai>` → this repository's Kit scope
  `workflow-kit-2026-11-03`, progress 3/4.
- `open "release/mac-arm64/Harness AI.app"` → main, renderer and Core
  processes start; the Core process environment carries
  `HARNESS_ELECTRON_NODE` and `HARNESS_WORKFLOW_KIT_BUNDLE` pointing into the
  app bundle.

## Repository on the Kit

- Kit 2.0.0 installed (`910532c1`), legacy plan migrated (`56b70afe`),
  Harness quality profile applied (`25cd7e53`), legacy plan scripts retired
  (`e369f8b6`; commit checks: architecture, lint, knip, typecheck, tests
  119.6 s, Kit builtins — all passed), round documentation (`014ba6e1`).

## Not covered

- Interactive UI walkthrough (New Project / Open Project / Doctor /
  autopilot) is left to the user's acceptance of the packaged app.
- Windows and Linux packages are not built in this release.
