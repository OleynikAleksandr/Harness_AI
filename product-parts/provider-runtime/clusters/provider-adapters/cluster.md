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
usage-limit reader, and provider-native request-template/tool payload details.
They do not read session profile files directly; Core passes immutable applied
profile payloads, including optional native request sidecars, through the
shared contract.

Adapters also own provider-specific phase and turn-completion semantics. The
shared client/runtime layer must not infer that a turn is complete merely
because a provider streamed assistant text. Each adapter translates its
upstream protocol into Core-visible events: progress text becomes
`commentary`, reasoning becomes `thinking`, and only the provider's explicit
terminal signal becomes the final assistant message. Native Codex app-server
already supplies this as `agentMessage.phase`; direct/custom providers that do
not have an equivalent upstream phase must add their own adapter-level
sentinel or continuation protocol. CodexUC is the accepted example: the
adapter adds a route-owned `final_answer` tool and treats plain Responses
`output_text` as non-terminal commentary.

Codex reasoning effort types follow the live app-server catalog: GPT-5.6
Sol/Terra add `max` and `ultra`, Luna adds `max`, while older picker-visible
models stop at `xhigh`. Core settings select the effort; the adapter translates
that normalized value into app-server `turn/start`.
