# Provider Retest Live Chunks Evidence - 2026-06-28

## Retest Findings

- Claude packaged app setup failed with `spawn npm ENOENT`.
- Codex and Kimi displayed reasoning.
- GLM Native, GLM OpenCode, OpenRouter, and Local Models displayed reasoning but assistant live chunks appeared as separate dialog cards.

## Reference Behavior Reapplied

- CodeAI Hub providers emit assistant live text as append-only messages tagged `live`.
- Core preserves the `live` tag, coalesces consecutive assistant live chunks for readback/display, and deduplicates final full-text assistant messages already covered by live chunks.
- Claude SDK setup keeps the reference installer flow and augments npm PATH for macOS packaged GUI launches.

## Verification

- `node product-parts/core-runtime/clusters/session-runtime/modules/session-event-stream/src/session-event-stream-facade.test.mjs`
- `node product-parts/core-runtime/clusters/session-runtime/modules/session-reasoning-display/src/session-reasoning-display-facade.test.mjs`
- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-live-tail-dedupe.test.mjs`
- `node product-parts/core-runtime/clusters/session-runtime/modules/session-request-handler/src/session-request-handler-facade.test.mjs`
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.test.mjs`
- `npm run typecheck`
