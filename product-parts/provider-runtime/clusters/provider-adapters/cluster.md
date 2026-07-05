# Provider Adapters Cluster

## Boundary

Owns fresh Harness AI provider adapters for every MVP provider.

## Owned Modules

- `provider-adapter-contract`
- `claude-provider`
- `codex-provider`
- `kimi-provider` (ACP; kept alive as the adapter behind the native request
  capture feature — its retirement is the remaining Phase 5 afterlife item)
- `kimi-client-provider`
- `glm-client-provider`
- `openrouter-client-provider`
- `local-models-client-provider`

The retired `glm-native-provider`, `openrouter-provider` and
`local-models-provider` modules (incl. their consumed `src/reference/**`
corpus) and the orphaned `provider-turn-runner` direct-dispatch debt module
were REMOVED by the 2026-07-05 legacy cleanup; the universal client is the
single client path for the client four.

## Facade Rule

Adapters expose the shared provider adapter contract and hide protocol-specific
process, SDK, stream, request, workspace prompt/project-instruction, session id,
and usage-limit reader details.
