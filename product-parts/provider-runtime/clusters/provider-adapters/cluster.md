# Provider Adapters Cluster

## Boundary

Owns fresh Harness AI provider adapters for every MVP provider.

## Owned Modules

- `provider-adapter-contract`
- `claude-provider`
- `codex-provider`
- `grok-provider`
- `kimi-client-provider`
- `kimi-native-capture`
- `kimi-native-session`
- `kimi-subagent-wire`
- `glm-client-provider`
- `openrouter-client-provider`
- `local-models-client-provider`

Only the three native vendor channels (`claude-provider`, `codex-provider`,
`grok-provider`) and
the universal-client four remain. The retired `glm-native-provider`,
`openrouter-provider`, `local-models-provider` and the orphaned
`provider-turn-runner` were removed by the 2026-07-05 legacy cleanup; the ACP
`kimi-provider` was removed by the same day's kimi-provider retirement order
and its standalone provider id `kimi` stays retired. Since the 2026-07-17
profile-routing order Kimi is profile-selective inside the one `kimi-client`
adapter: sessions of the built-in `native` profile run through the
`kimi-native-session` ACP backend (installed CLI, default agent, real
provider home), while every managed profile stays on the Core universal
client — the Kimi ACP surface cannot verifiably change prompt or tooling.
`kimi-subagent-wire` complements that native path: the ACP stream is silent
about subagent internals, so it resolves each synthesized `kimi-agent-*`
child id to the sub-agent's own `wire.jsonl` in the CLI session store and
tails it into the standard dialog/turn/token-usage provider events the Core
pipeline already routes. The universal client remains the single production
session path for the other client endpoints. `kimi-native-capture` stays a diagnostic driver for
the installed Kimi CLI's default-agent request; it is not a session adapter.
The older consumed `src/reference/**` runtime corpus lives on in git
history.

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
sentinel or continuation protocol.

Claude exposes raw Agent SDK JSON Schema results as a generic
`structured_output` provider event. Codex app-server exposes the same logical
result as serialized JSON in `commentary` and final `agentMessage` items; when
and only when Core sent `turn/start.outputSchema`, the Codex adapter parses
those messages and emits phase-marked provider-neutral events instead of raw
JSON dialog messages. Intermediate events keep the final schema expectation
active. Core workflow owners validate the resulting object; adapters do not
specialize it for Profile Studio and renderer text is never parsed.

Native collaboration is normalized at the same boundary. Codex app-server
`subAgentActivity` (plus the legacy `collabAgentToolCall` shape), child
`thread/started`, child turn lifecycle, and `thread/status/changed`
notifications become provider-neutral subagent events. Structured
`source.subAgent.thread_spawn` supplies the child path/nickname/role; Core, not
the adapter or renderer, owns the resulting parent-child session graph.
When Core has no child record for an already-persisted Codex thread, the
adapter uses official `thread/list(ancestorThreadId)` and
`thread/read(includeTurns=true)` responses to replay the same structured
events. Ancestor-inherited collaboration items in a forked child history are
excluded by structured agent-path/sender ownership, so sibling launches cannot
become false nested calls. The adapter does not inspect provider JSONL files.

Grok is a native subscription-backed channel over the official Grok Build ACP
stdio process. Its module owns CLI discovery, cached-auth readiness, ACP
transport, native session/profile/tool/permission/MCP/subagent translation and
Codex-equivalent session telemetry. It is not part of the OpenAI-shape
universal client.

Codex reasoning effort types follow the live app-server catalog: GPT-5.6
Sol/Terra add `max` and `ultra`, Luna adds `max`, while older picker-visible
models stop at `xhigh`. Core settings select the effort; the adapter translates
that normalized value into app-server `turn/start`. Native Request Capture
uses the same explicit provider-neutral reasoning intent: Codex applies it to
`turn/start.effort`, while Claude applies its supported
`low/medium/high/xhigh/max` values through the interactive CLI `--effort`
argument.
