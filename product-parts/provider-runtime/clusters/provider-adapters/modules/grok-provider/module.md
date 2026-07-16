# Grok Provider Module

## Responsibility

Own the native subscription-backed Grok Build provider adapter. The module
locates the official CLI without relying on the Electron GUI process shell
profile, reuses CLI-owned cached authentication without reading token contents,
and will translate the Core provider contract to Grok ACP stdio.

The foundation exposes binary discovery, a read-only readiness probe and a
tolerant newline-delimited JSON-RPC router. It deliberately does not register a
visible provider until the ACP session/profile/telemetry contract is
implemented and verified.

Binary discovery order is deterministic:

1. explicit Core-provided path;
2. `${GROK_HOME}/bin/grok`;
3. `${os.homedir()}/.grok/bin/grok`;
4. each directory in `PATH`.

Readiness runs `--version`, then `--no-auto-update models`. A successful model
catalog proves that the installed CLI can reuse its cached subscription auth.
The module returns structured `missing`, `login_required`, `unavailable`, or
`ready` state and never exposes command stderr or auth-file contents to UI.

`GrokAcpRouter` owns ACP request identifiers, response correlation, provider
notifications and reverse client requests. Every request has a bounded timeout;
AbortSignal cancellation emits `$/cancelRequest`, and process shutdown can
reject every outstanding request. Reverse requests are answered with structured
JSON-RPC success or error payloads. Malformed/unmatched protocol messages are
reported diagnostically and never become renderer-owned inference.

`GrokAcpProcess` supervises exactly one `grok --no-auto-update agent
--no-leader stdio` child per provider session. It serializes writes, routes
newline-delimited stdout, bounds retained stderr, distinguishes requested stop
from unexpected exit, and rejects orphaned requests on every exit. The
supervisor does not copy or inspect Grok authentication state; the child uses
the installed CLI home directly.

`GrokSessionRuntime` owns one immutable provider-session binding. It performs
ACP v1 initialize, selects cached subscription authentication when advertised,
creates or loads a session, applies model/reasoning selection, sends structured
text content blocks, emits native cancel and closes the session process. Model
switching uses installed-build `session/set_model` first and falls back only on
method-not-found to `session/setModel` for source/build compatibility.

`GrokEventNormalizer` consumes ACP `sessionUpdate` discriminators, never output
text heuristics. It projects assistant/reasoning chunks, tool calls/results,
plans, usage, model changes and explicit retry/recovery failures into the
existing provider event vocabulary. Prompt completion preserves Grok's native
`totalTokens` and `cachedReadTokens`; the context limit remains provider/Core
telemetry truth rather than a guessed value.

Native profile application emits no ACP prompt or agent-profile override.
Managed application sends the frozen prompt once as
`_meta.systemPromptOverride` and a minimal `_meta.agentProfile` with verified
Claude-compatible Grok aliases, `agentsMd: false` and `discoverSkills: false`.
The category map is `file-read → Read/Glob/Grep`, `file-write → Write/Edit`,
`shell/git/tests → Bash`, `web → WebSearch/WebFetch`. Empty/unresolved managed
tool selections fail before session creation. After `session/new` the adapter
must query `_x.ai/session/info`; agent-name or effective-tool-count mismatch
fails the binding instead of falling back to the full vendor toolset.

`GrokProviderAdapter` composes the public provider lifecycle with one ACP
process/runtime per bound session. Create/resume return immutable provider IDs
and applied-profile details, subscriptions are isolated by provider session,
turn start/completion/failure is normalized, turn model/effort options are
forwarded, and close cancels an active turn before stopping only that process.
The adapter creates no Harness-owned persistent session artifacts, so deletion
never recursively touches Grok-owned history under the CLI home.

`normalizeGrokModelCatalog` consumes only ACP-advertised `modelState` truth.
Each model keeps its provider ID, label, description, context window and native
reasoning menu; the reasoning option value (not a presentation alias) is the
wire ID used for selection. Missing catalog fields remain absent/null and are
never filled from a static UI list.

`GrokBillingClient` reads the authenticated `_x.ai/billing` extension through
the session ACP transport. The normalized snapshot carries the subscription
tier, native weekly/monthly period and reset, included/on-demand/prepaid credit
facts and unified-billing state. `creditUsagePercent` is preferred, legacy
limit/used fields are used only when both make a percentage provable, and an
unreported percentage remains `null` rather than becoming a misleading zero.

`GrokInteractionBridge` allowlists exactly ACP tool permission,
`x.ai/ask_user_question` and `x.ai/exit_plan_mode` reverse requests. It emits
sanitized provider-neutral interactions without raw tool inputs, credentials
or arbitrary extension payloads, then maps the validated Core decision back to
the matching JSON-RPC request. Cancellation, replacement and timeout fail
closed. Unknown reverse methods are rejected.

ACP `mcpServers` can be supplied only through Core-owned adapter options and is
passed at session creation without renderer inspection. An empty list does not
disable Grok's own trusted project/user MCP discovery; MCP credentials and
server tool payloads remain inside the official CLI lifecycle.

`GrokSubagentNormalizer` consumes only native
`x.ai/session_notification` variants `subagent_spawned`, `subagent_progress`
and `subagent_finished`. It correlates parent prompt, parent/child ACP session
IDs and native subagent identity, maps terminal `cancelled` to provider-neutral
`interrupted`, and emits the existing `subagent_control`, `subagent_session`
and child-channel `subagent_status` contract. The adapter registers child ACP
session aliases before Core adoption, routes ordinary child notifications to
child-only listeners, and never starts a second Grok process for a live child.

Persisted spawn/finish notifications replay through `session/load`. After
binding, the adapter additionally calls native `_x.ai/subagent/list_running`
to recover transient progress lost during disconnect. Child transcript and
terminal state therefore converge through structured provider events; no
renderer text recognition or Harness-owned Grok-history parser is used.

## Public Facade

`GrokProviderFacade`

## Inputs

- Optional Core-selected binary path.
- Process environment, provider home and platform path conventions.
- Installed official Grok CLI and CLI-owned cached login.

## Outputs

- Resolved executable path.
- CLI version and structured readiness/auth status.
- Typed ACP requests, responses, notifications and reverse-request dispatch.
- Expected/unexpected ACP process exit and bounded diagnostic stderr.
- Initialized/authenticated ACP session identity and applied model/reasoning.
- Provider-neutral display, progress, usage and failure events from ACP tags.
- Native/Managed session metadata plus verified applied-profile proof.
- Complete `ProviderAdapter` create/resume/send/subscribe/close composition.
- Dynamic ACP model/reasoning catalog with native context windows.
- Subscription billing tier, period/reset and truthful optional usage percent.
- Core-mediated permission, ask-user and plan-approval blocking interactions.
- Native Grok MCP discovery plus optional Core-provided ACP server config.
- Native parent/child sessions, live progress, terminal/cancelled status and
  recovered child transcript routing through the shared subagent lifecycle.
- Future ACP-backed `ProviderAdapter` lifecycle from the same module boundary.

## Owned Paths

- `module.md`
- `src/**`
