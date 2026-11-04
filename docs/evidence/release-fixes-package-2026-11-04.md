# Release fixes package — 2026-11-04

Scope: `release-fixes-2026-11-04`, delivery task `F7`. Source commit:
`d88bdc86` (`docs: reconcile documentation for R1`). Confirmation: the user's
request "исправляй эту ошибку. Собирай новый релиз".

## Build

- `npm run package:mac` → exit 0; `release/mac-arm64/Harness AI.app`
  (unsigned, default icon); `app.asar` 32.9 MB; `workflow-kit/workflow.mjs`
  223 KB.
- `app.asar` contains the fixes: `claude-subagent-files.js` and
  `claude-subagent-observer.js` with `task-notification` handling,
  `core-workspace-rpc.js` with `remove-workspace`, the bridge channel and
  preload method, and `sidebar.removeProject` in the renderer bundle and the
  source dictionaries.
- `open "release/mac-arm64/Harness AI.app"` → main and Core processes start.

## Async subagents on real data

The fixed observer (`hydrate()`) over the Claude transcripts of
`Test_New_HarnesAI_001` (parent `e328321b-…`, three background agents
launched with `async_launched` on 2026-11-03):

- statuses: `agent-ac99ebb66665106e1`, `agent-a61af8aa2aa278781`,
  `agent-af9d4838769476ae5` → `completed` (before the fix: `failed`);
- transcript text reaches every child channel (5, 4 and 4 messages).

Live streaming after the parent turn and the end of the background poll are
covered by `claude-subagent-observer.test.mjs`.

## Remove from Harness AI

Covered by tests: `core-workspace-rpc.test.mjs` (registry entry, session
release, provider residue, fallback to the built-in workspace, refusals,
persisted snapshot), `session-tree-release.test.mjs`,
`workspace-registry-facade.test.mjs`, `provider-home-manager-facade.test.mjs`
and `workspace-menu.test.mjs`. The right-click menu in the packaged UI is
left to the user's check.

## Not covered

- A live Claude run with background subagents in the packaged app and the
  right-click flow in the UI — the user's acceptance.
