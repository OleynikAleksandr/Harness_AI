# Codex Native Session Delete - 2026-06-29

## Scope

User retest showed Harness-managed session JSONL deletion works, but the Codex
native rollout file remained under:

`<workspace>/.harness/runtime/providers/codex/home/sessions/YYYY/MM/DD/rollout-*-<providerSessionId>.jsonl`

## Result

Root cause: `SessionRequestHandlerFacade.deleteSession()` closed the live
provider binding and removed Core-owned session state, but did not call the
provider adapter contract's optional `deleteSessionArtifacts(providerSessionId,
workspacePath)` hook. The Codex adapter and rollout cleanup helper already
existed; Core simply skipped the hook.

Fix: deleting a Core session now resolves the provider session id from the live
runtime binding or the persisted `CoreSession.providerSessionId` fallback, then
calls `deleteSessionArtifacts` after the close promise resolves. This keeps the
fix provider-neutral and also covers restored sessions whose provider id was
persisted before a core restart.

## Guards

- `session-request-handler-facade.test.mjs` asserts the delete path uses the
  persisted provider session id fallback and calls `deleteSessionArtifacts`.
- `codex-rollout-cleanup.test.mjs` confirms the Codex cleanup helper removes the
  target rollout file, keeps siblings, is idempotent, and tolerates a missing
  sessions directory.

## Checks

- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs` - OK
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/codex-provider/src/reference/provider/codex-rollout-cleanup.test.mjs` - OK
- `npm run check:architecture` - OK
- `npm run lint` - OK
- `npm run typecheck` - OK
- `npm test` - OK (46)
