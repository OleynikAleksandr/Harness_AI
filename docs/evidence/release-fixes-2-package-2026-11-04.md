# Release fixes round 2 package — 2026-11-04

Scope: `release-fixes-2026-11-04-2`, delivery task `D1`. Source commit:
`bcb374a3` (`docs: reconcile documentation for R1`). Confirmation: the user's
instructions "создавай новую спецификацию to-do plan вплоть до сборки нового
релиза" and "Да, выполняй всё".

## Build

- `npm run package:mac` → exit 0 (it runs `npm run build` first);
  `release/mac-arm64/Harness AI.app` (unsigned, default icon); `app.asar`
  33 MB.
- `Resources/workflow-kit/workflow.mjs` is byte-identical to
  `dist/workflow-kit/workflow.mjs` and has `KIT_VERSION = "2.1.1"`,
  `identity:set` and the builtin `kit:conflict-markers`.
- `app.asar` contains `kit-cli-identity.js`, `core-login-path.js`, the
  `workflow-identity-set` route in `core-project-workflow-rpc.js`, the
  incremental bundle refresh (`sourceEntries`) in
  `localization-materializer.js` and the git identity form strings in the
  renderer bundle.
- `open "release/mac-arm64/Harness AI.app"` → the main and helper processes
  start.

## Kit bundle smoke on a temporary project

With the built bundle, a temporary `HOME` and a new repository:

- `install --host harness` without any identity → `GIT_IDENTITY_REQUIRED`,
  with the problem named once in the message, and nothing written;
- `identity:set` with an email in typographic quotes → `GIT_IDENTITY_INVALID`
  (`field: email`); without `--global` → `USAGE`; an `example.com` address →
  `GIT_IDENTITY_PLACEHOLDER`;
- `identity:set --name "Smoke Tester" --email smoke@harness-smoke.dev
  --global` → ok, and the global git config holds the address;
- `install --host harness` → ok; `.gitignore` lists `.DS_Store`, and the
  quality config lists `kit:conflict-markers`.

## Left to the user's check

These are left to the user's check in the packaged app: the identity form in
Open/New Project and the Project Doctor, Open Project without a name field,
the mode card under the owner session in the left sidebar, the autopilot
continuing after the mode choice, and `node` found by agents of an app
started from Finder. The card's titles and buttons follow the UI Labels
language setting.
