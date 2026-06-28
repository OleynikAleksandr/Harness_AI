# Claude SDK Executable Layout Evidence - 2026-06-28

## Retest Finding

Claude setup reached SDK verification but failed on:

`ENOENT: no such file or directory, access '/Users/oleksandroliinyk/.harness-ai/providers/claude/sdk/bin/claude'`

## Root Cause

The installed `@anthropic-ai/claude-agent-sdk` package stores the platform binary under its optional dependency:

`~/.harness-ai/providers/claude/sdk/lib/node_modules/@anthropic-ai/claude-agent-sdk/node_modules/@anthropic-ai/claude-agent-sdk-darwin-arm64/claude`

It does not create `<prefix>/bin/claude` in this local packaged install layout.

## Verification

- `node product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/reference/installer/sdk-executable-path.test.mjs`
- `node product-parts/provider-runtime/clusters/provider-adapters/modules/claude-provider/src/claude-provider-facade.test.mjs`
- `node -e` access check against the installed darwin-arm64 SDK binary path.
