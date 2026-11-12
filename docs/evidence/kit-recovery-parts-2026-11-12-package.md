# Workflow Kit 2.2.3 release package — 2026-11-12

Scope: `kit-recovery-parts-2026-11-12`, delivery task `D2`. Source commit:
`7afe27ad` (`chore: build the workflow kit 2.2.3 bundle`). Confirmation: the
user's words «И выполни и пересобери новый релиз… Harness AI» and «Я все
принимаю. Дальше делай все как положено».

## Build

- The app was not running. `npm run package:mac` → exit 0 (it runs
  `npm run build` first); `release/mac-arm64/Harness AI.app` (unsigned,
  default icon, electron 42.5.0, arm64); `app.asar` 33 237 026 bytes.
- `Resources/workflow-kit/workflow.mjs` is byte-identical to
  `dist/workflow-kit/workflow.mjs` and has `KIT_VERSION = "2.2.3"`: projects
  installed or updated from the app get the six Claude session-start hooks,
  the Codex entry with `additionalContextLimit` and the new `AGENTS.md`
  rule (evidence of the bundle:
  `docs/evidence/kit-recovery-parts-2026-11-12-bundle.md`).

## Left to the user's check

- Start the packaged app; Harness itself delivers the packet through the
  provider system prompt (`HARNESS_WORKFLOW_RECOVERY=host`), unchanged.
