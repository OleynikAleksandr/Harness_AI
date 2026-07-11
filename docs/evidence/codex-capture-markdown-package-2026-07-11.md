# Codex Capture Markdown Package — 2026-07-11

## Scope

User-approved macOS arm64 package rebuild after fixing Native Request Capture
Markdown extraction for the Codex 0.144.1 embedded `response.create` schema.

## Included Behavior

- The developer message beginning with `You are Codex` is rendered under
  `System Prompt` with literal newlines and spacing.
- The developer item with `type: "additional_tools"` is rendered as individual
  `Tool Declarations`; tool descriptions use readable text blocks instead of
  JSON-escaped newline sequences.
- The extracted system and tool items are removed from `Developer Context`,
  while the remaining permissions, skills, plugins and user context stay in
  their profile-relevant groups.
- Legacy top-level `instructions` and `tools` extraction remains covered.

## Verification

- Implementation commit: `8c9ada99 fix: render codex capture payload as readable markdown`.
- Commit gates passed all 81 test groups, including capture-artifacts,
  capture-orchestrator and capture-proxy.
- `npm run package:mac` completed successfully and produced
  `release/mac-arm64/Harness AI.app`.
- Packaged runtime path verified inside `app.asar`:
  `dist/runtime/product-parts/core-runtime/clusters/provider-network-capture/modules/capture-artifacts/src/capture-markdown-format.js`.
- Direct packaged-content inspection found `findCodexAdditionalTools`, the
  `additional_tools` exclusion and the `startsWith("You are Codex")` system
  recognition branch.
- Packaged `app.asar` SHA-256:
  `38ab16139381c2461ea0029de035a1312f56db2342ddd6a02af84cfabcf4b017`.
- Launch smoke passed: the packaged main process, Core runtime process and
  renderer process started from the rebuilt application.

## Artifact

`/Users/oleksandroliinyk/VSCODE/harness-ai/release/mac-arm64/Harness AI.app`
