# Provider Adapters Cluster

## Boundary

Owns fresh Harness AI provider adapters for every MVP provider.

## Owned Modules

- `claude-provider`
- `codex-provider`
- `kimi-provider`
- `glm-native-provider`
- `glm-opencode-provider`
- `openrouter-provider`
- `local-models-provider`
- `provider-turn-runner`

## Facade Rule

Adapters expose provider facades and hide protocol-specific process, SDK, stream, and request details.
