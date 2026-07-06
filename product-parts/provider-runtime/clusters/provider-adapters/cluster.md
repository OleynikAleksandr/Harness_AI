# Provider Adapters Cluster

## Boundary

Owns fresh Harness AI provider adapters for every MVP provider.

## Owned Modules

- `provider-adapter-contract`
- `claude-provider`
- `codex-provider`
- `codex-uc-provider`
- `kimi-client-provider`
- `glm-client-provider`
- `openrouter-client-provider`
- `local-models-client-provider`

Only the two native vendor channels (`claude-provider`, `codex-provider`), the
Codex OAuth Responses-compatible test surface (`codex-uc-provider`), and the
universal-client four remain. The retired `glm-native-provider`,
`openrouter-provider`, `local-models-provider` and the orphaned
`provider-turn-runner` were removed by the 2026-07-05 legacy cleanup; the ACP
`kimi-provider` (and its Kimi native-capture channel) was removed by the same
day's kimi-provider retirement order. Their consumed `src/reference/**` corpus
lives on in git history. The universal client is the single client path for
the client four; CodexUC is intentionally separate because it speaks streamed
Responses-compatible Codex OAuth rather than Chat Completions.

## Facade Rule

Adapters expose the shared provider adapter contract and hide protocol-specific
process, SDK, stream, request, workspace prompt/project-instruction, session id,
and usage-limit reader details.
