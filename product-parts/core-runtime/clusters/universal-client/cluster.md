# Universal Client Cluster

## Boundary

Owns the Core-owned universal client for OpenAI-shape providers — Kimi, GLM,
Local Models, OpenRouter, and any future OpenAI-shape vendor. The client is one
Core Runtime engine (the agent loop, the tool registry and built-in tool
execution, SSE + dialect streaming, and provider output-event mapping) that
provider endpoints ride on as thin Provider-Runtime modules. Claude and Codex
are NOT clients of this cluster: they keep their native vendor channels (Agent
SDK / app-server).

Contract source: `docs/architecture/UniversalClient.md` (the capability set,
the OSS foundation roles, and the recorded user decisions in its section 6).
The core is a consolidation of the ported CodeAI-Hub reference runtime
(`openrouter-provider` / `glm-native-provider` / `local-models-provider`
`src/reference/**`), with OpenCode (MIT) as the behavior/extensibility
reference; behavior is ported, code is never copied.

## Owned Modules

- `client-contract`

## Facade Rule

The cluster owns the client engine end to end: the turn agent loop
(request -> SSE stream -> tool execution -> follow-up until no tool calls),
the tool registry with a source abstraction (built-in tools now; MCP and
skills are reserved registration points, not MVP), built-in tool execution
inside the workspace, the consolidated SSE + dialect layer, and the mapping of
the provider output stream onto the Core `NormalizedProviderEvent` contract.
Permissions are full-auto (pass-through) in MVP — no ask/allow-deny/sandbox.
Provider-specific wire details (base URL, auth key, dialect capability profile,
model id) live in the Provider-Runtime endpoint modules, which call into this
core; this cluster stays provider-neutral. Renderer/client code only submits
user input and displays Core-normalized events — it never executes tools or
derives provider truth.

MCP hosts, skills, subagents, and plan mode are FUTURE MODULES added through
the tool-registry source abstraction without reworking the core; they are not
implemented in MVP (`docs/architecture/UniversalClient.md` sections 3.10 / 6).
