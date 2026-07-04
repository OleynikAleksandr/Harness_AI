# Provider Adapters Cluster

## Boundary

Owns fresh Harness AI provider adapters for every MVP provider.

## Owned Modules

- `provider-adapter-contract`
- `claude-provider`
- `codex-provider`
- `kimi-provider`
- `kimi-client-provider`
- `glm-client-provider`
- `glm-native-provider`
- `glm-opencode-provider`
- `openrouter-provider`
- `local-models-provider`
- `provider-turn-runner` (deprecated direct dispatch debt until Core-owned dispatch replaces current UI wiring)

## Facade Rule

Adapters expose the shared provider adapter contract and hide protocol-specific
process, SDK, stream, request, workspace prompt/project-instruction, session id,
and usage-limit reader details.
