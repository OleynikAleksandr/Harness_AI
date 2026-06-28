# Claude Session Resume And Workspace Instructions Evidence

Date: 2026-06-28

## Reference Findings

- CodeAI-Hub Claude SDK promotes temporary session ids to real Claude session ids through `sessionIdChanged`.
- CodeAI-Hub provider adapter forwards the event to Core.
- CodeAI-Hub Core updates provider binding before later turns, so resume uses the real provider session id.

## Harness Implementation

- Core `session-request-handler` now reads `sessionIdChanged` and `realSessionId` provider events and updates the authoritative provider binding before later turns are dispatched.
- Claude provider runtime now builds the SDK system prompt with the active workspace path and inline `AGENTS.md` content from the workspace root.
- The renderer remains display/input only; it does not infer workspace instructions or session ids.

## Verification

- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/provider-session-id-promotion.test.mjs`
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/sdk/claude-workspace-system-prompt.test.mjs`
- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.test.mjs`
- `npm run typecheck`
