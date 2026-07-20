# Harness AI Product Tree

The machine source of truth is `.harness/product-tree/product-tree.json`. This Markdown file is the readable projection for review in VS Code.

## Rules

- Production code lives under `product-parts/**`.
- Every Product Part contains Clusters; every Cluster contains Modules.
- Every module exposes one public facade boundary when implementation starts.
- CodeAI Hub is reference material only. Do not copy modules wholesale.

## Application Shell

Standalone Electron interface surface and Core supervisor/client. It owns no backend truth.

Application Shell submits user input, displays Core read models/events, manages windows, and supervises the Core process. It must not compose Core Runtime or Provider Runtime implementation modules in-process.

### Electron Host

- `app-bootstrap`: Electron lifecycle, window creation, local app startup.
- `core-process-bridge`: starts, stops, restarts, health-checks, or connects to the local Core Runtime process through process contracts only.
- `vscode-link-opener`: opens absolute file links in Visual Studio Code and web links in the system browser.

### Session Interface

- `session-window`: transcript/dialog layout, session chrome, next-session mode panel, Core-provided localizedContent reveal from Core read models, and GFM markdown rendering of assistant replies.
- `input-controls`: message input, Stop/Play controls, busy/lock display, and user intent submission only.
- `turn-timer`: pure-display session turn timers — the per-turn input-row timer and the footer-right total of completed turns, rendered from Core-derived timing props.
- `session-telemetry`: usage limits, context window, provider/model status surfaces from Core telemetry.
- `session-sidebar`: workspace switcher, workspace sessions list, next-session mode entry, session rename, Settings entry.

### Settings Surface

- `provider-settings-ui`: provider cards, auth/model/reasoning controls submitted through Core contracts.
- `localization-settings-ui`: UI language and reasoning translation controls submitted through Core contracts.
- `recovery-controls-ui`: Core restart/recovery action surface backed by a real Core process stop/start lifecycle.
- `profile-settings-ui`: Profile Creator settings tab for provider-scoped session profile management.

### Browser Localization

- `browser-localization-provider`: shared renderer localization provider and `t(category, messageId, fallback)` lookup boundary over Core-provided runtime payloads.

## Core Runtime

Out-of-process long-running local authority for workspaces, sessions, orchestration, provider composition, settings, localization, and workspace truth.

### Runtime Process

- `core-runtime-process`: Core process entrypoint plus health, status and shutdown process contracts.

### Workspace Architecture

- `workspace-registry`: known workspaces and active workspace selection.

### Session Runtime

- `session-registry`: session metadata, create/open/rename.
- `session-request-handler`: Core-owned create/resume/send/stop routing, provider dispatch, next-session mode truth, and backward-compatible persisted session-purpose metadata including Profile Creator binding.
- `provider-session-binding`: Core session to provider session id and binding state.
- `session-event-stream`: provider-neutral Core session events for Application Shell projections.
- `session-snapshot-projector`: read model for the Electron session UI.
- `session-reasoning-display`: projects provider-visible reasoning/thinking into Core dialog messages.
- `turn-timing`: derives per-turn active time and open-turn start from the persisted `session:turn-state` event log.

### Session Profiles

- `profile-store`: session profile documents on disk — Profiles root resolution, legacy v1 compatibility, Studio v2 provider/model passports with Draft-tolerant two-part prompt sources, provider-scoped seeds, and shared profile types.
- `profile-catalog`: profile selection truth — legacy provider picker with virtual Native, exact provider/model Studio-only catalogs, and Core-enforced Draft/Valid session resolution.
- `profile-materializer`: provider-neutral profile payload — unchanged legacy wrappers plus Studio v2 two-part prompt compilation with no ambient instructions and a target/tools/donor content hash.
- `profile-authoring`: profile creation truth — legacy templates/editor paths plus atomic agent-owned Studio v2 Draft creation and full-snapshot replacement without external-editor access.

### Provider Network Capture

- `capture-artifacts`: capture type model, credential-header redaction, provider-neutral profile section extraction (system prompt / tool schemas / developer context), and the reasoning-qualified raw JSONL + diagnostics JSONL + readable markdown artifact writer for native request capture.
- `capture-certificates`: diagnostic CA and per-host leaf certificates for the capture proxy's TLS termination, plus the env hints that make a provider client trust the CA for the capture run only.
- `capture-proxy`: MITM CONNECT proxy that terminates TLS with a diagnostic cert, reads the provider's full request, filters the target endpoint from background traffic, and supports the forward-transit capture path required by Codex app-server WebSocket transport; also owns the Kimi native-CLI reverse-forward bridge for a client that ignores proxy env.
- `capture-orchestrator`: command-level orchestration of model/reasoning-qualified native request capture — selects the CONNECT proxy or Kimi reverse bridge, wires the capture transport and artifact writer, invokes the provider diagnostic capture driver, and returns the artifact paths.

### Profile Studio

- `profile-studio-lifecycle`: immutable Draft identity, exact provider/model and creator-session binding, deterministic content-hash approval, and edit-to-Draft transition truth.
- `profile-studio-authoring`: validates complete creator snapshots, honest provider tool modes, and contained raw Native Capture provenance before managed lifecycle updates.
- `profile-studio-agent`: fixed isolated Claude/Opus/high creator turn spec with complete inline context, no ambient settings/tools, and full-snapshot JSON Schema validation.
- `profile-studio-read-model`: provider/model targets, compatible creator-session rows, and Core-owned Overview/Prompt/Tools snapshots with honest Claude/Codex/Kimi capability states.

### Universal Client

- `client-contract`: shared client contract types — turn request / messages / tool-calls, tool descriptor with a source abstraction (built-in now, MCP/skill reserved), per-provider dialect capability profile, client output-event and error model, and tool-name namespacing. Core-owned universal client for the OpenAI-shape provider four (Kimi/GLM/Local/OpenRouter); MCP/skills/subagents are reserved extension points, not MVP.
- `dialect-streaming`: consolidated SSE + dialect layer — read `data:` frames, parse each OpenAI-shape chat.completions chunk into a normalized delta (content / thinking / tool-call deltas / usage / model / finish), accumulate tool calls by index, and normalize the provider thinking forms (`reasoning_content` / `reasoning` / `<think>` tags) onto one channel. Merges the three ported reference SSE readers.
- `tool-registry`: tool registry with a source abstraction — aggregate tool descriptors from sources (built-in now; MCP/skills reserved registration points, not MVP), route a tool call to its owning source, and expose a pass-through permission boundary (full-auto in MVP, no ruleset).
- `builtin-tools`: the built-in tool source — descriptors + executors for the MVP tool set (`read_file`, `write_file`, `edit_file`, `apply_patch`, `exec_command`, `grep_files`, `glob_files`; `web_search`/`web_fetch` in part 2), with workspace-path validation, process timeouts and output caps. Ported from the reference glm-native tool executors.
- `client-core`: the agent loop — build the `chat.completions` request from history + tools + dialect, stream it via `dialect-streaming`, execute tool calls full-auto through the registry and feed results back until the model stops asking, with a 64-step ceiling, doom-loop detection, and retries + Retry-After. Emits `ClientTurnEvent`s; `callModel` does one streamed model call.

### Settings And Localization

- `settings-store`: global/workspace settings persistence.
- `localization-runtime`: approved source dictionaries, glossary protection, browser localization bootstrap, and materialized runtime bundle state.
- `reasoning-translation-overlay`: visible reasoning translation policy, source hashing, pending state, sidecar overlays, and patch payloads.

## Provider Runtime

Independent provider adapters, provider homes/auth, usage telemetry, and provider-backed translation engines composed by Core Runtime only.

### Provider Registry

- `provider-registry`: provider catalog, availability, invocation profile descriptors, and Core-owned adapter registration.
- `provider-descriptor`: model/reasoning capabilities and UI metadata.

### Provider Readiness

- `provider-readiness-registry`: raw provider liveness and workspace provisioning state, readiness combination, and raw readiness change notifications.
- `provider-liveness-checker`: provider liveness preflight helpers and env-isolated global-home adapter initialization.
- `provider-workspace-provisioner`: provider-owned workspace home provisioning and raw per-workspace readiness state updates.

### Provider Adapters

- `provider-adapter-contract`: shared create/resume/send/subscribe/close adapter boundary used by Core.
- `claude-provider`: Claude provider adapter.
- `codex-provider`: Codex provider adapter.
- `grok-provider`: official Grok Build ACP provider adapter using CLI-owned
  subscription authentication.
- `kimi-client-provider`: thin Kimi endpoint for the Core universal client and the profile-selective session router (2026-07-17) — native-profile sessions delegate to the `kimi-native-session` ACP backend, managed profiles run the client loop with the materialized prompt/tool whitelist applied; holds Kimi dialect specifics (`api.kimi.com/coding/v1`, Core session-selected Coding Plan model, `reasoning_content`) and the `ClientTurnRequest` builder.
- `kimi-native-capture`: diagnostic-only driver for the installed Kimi CLI — temporary native config/auth home, selected-model alias materialization, reverse-bridge provider URL rewrite, and one ACP default-agent probe; it is not a production session adapter.
- `kimi-native-session`: native ACP session channel for the `kimi-client` adapter — supervised `kimi acp` child (default agent, full-access mode, self-update pinned off) running in the workspace provider home (`.harness/runtime/providers/kimi/home`, auth symlinked to the real `~/.kimi-code`) with JSON-RPC correlation serving native-profile sessions; managed profiles stay on the universal client.
- `kimi-subagent-wire`: sub-agent wire reader for synthesized Kimi child sessions — resolves a `kimi-agent-*` child provider session id to the child agent's `wire.jsonl` in the CLI session store (spawn-prompt matching plus `state.json` fallback) and tails it incrementally into standard `dialog_message` / turn lifecycle / `token_usage` provider events with deterministic wire-line ids.
- `glm-client-provider`: thin GLM endpoint for the Core universal client — Z.ai coding dialect specifics (`api.z.ai/api/coding/paas/v4`, `Accept-Language`, `reasoning_content`, GLM `extraBody` params) and the `ClientTurnRequest` builder the Core agent loop runs.
- `openrouter-client-provider`: thin OpenRouter endpoint for the Core universal client — OpenRouter dialect specifics (`reasoning_details` thinking, usage in any chunk, per-turn `apiKey`/`baseUrl`/`defaultModel`/`endpointTag` from the shared `openRouter` settings section) and the `ClientTurnRequest` builder the Core agent loop runs.
- `local-models-client-provider`: thin Local Models endpoint for the Core universal client — local-server dialect specifics (per-turn base URL from Core settings resolved to a `/v1` request base, optional Bearer key, `reasoning_content` thinking, no `tool_choice`) and the `ClientTurnRequest` builder the Core agent loop runs.

### Provider Home And Auth

- `provider-home-manager`: isolated provider home layout.
- `provider-auth-store`: API keys/auth references outside tracked workspace files.

### Provider Events And Translation

- `provider-event-normalizer`: provider stream/event normalization.
- `usage-context-telemetry`: usage limits and context-window signals.
- `provider-translation-engines`: provider-backed UI/reasoning translation engines.
