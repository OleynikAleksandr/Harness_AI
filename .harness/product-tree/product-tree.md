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
- `vscode-link-opener`: opens absolute file links in Visual Studio Code.

### Session Interface

- `session-window`: transcript/dialog layout, session chrome, next-session mode panel, and Core-provided localizedContent reveal from Core read models.
- `input-controls`: message input, Stop/Play controls, busy/lock display, and user intent submission only.
- `session-telemetry`: usage limits, context window, provider/model status surfaces from Core telemetry.
- `session-sidebar`: workspace switcher, workspace sessions list, next-session mode entry, session rename, Settings entry.

### Settings Surface

- `provider-settings-ui`: provider cards, auth/model/reasoning controls submitted through Core contracts.
- `localization-settings-ui`: UI language and reasoning translation controls submitted through Core contracts.
- `recovery-controls-ui`: Core restart/recovery action surface backed by a real Core process stop/start lifecycle.
- `profile-settings-ui`: Profile Creator settings tab for session profile management.

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
- `session-request-handler`: Core-owned create/resume/send/stop routing, provider dispatch, and next-session mode truth for session actions.
- `provider-session-binding`: Core session to provider session id and binding state.
- `session-event-stream`: provider-neutral Core session events for Application Shell projections.
- `session-snapshot-projector`: read model for the Electron session UI.
- `session-reasoning-display`: projects provider-visible reasoning/thinking into Core dialog messages.

### Session Profiles

- `profile-store`: user-editable session profile documents on disk — Profiles root resolution, document layout, and the shared profile type model.
- `profile-catalog`: profile selection truth — catalog read models, virtual Native profile, per-provider applicability, and session-creation resolution with structured errors.
- `profile-materializer`: provider-neutral session profile payload — applied prompt with the system wrapper, effective tooling categories, and applied-content hash.
- `profile-authoring`: profile creation and editing truth — document templates, create-profile operation with derived ids, and editor path resolution.

### Provider Network Capture

- `capture-artifacts`: capture type model, credential-header redaction, provider-neutral section extraction (system prompt / tool schemas / messages), and the JSONL + readable markdown artifact writer for native request capture.
- `capture-certificates`: diagnostic CA and per-host leaf certificates for the capture proxy's TLS termination, plus the env hints that make a provider client trust the CA for the capture run only.
- `capture-proxy`: capture-and-abort MITM CONNECT proxy that terminates TLS with a diagnostic cert, reads the provider's full request, filters the target endpoint from background traffic, and aborts before any upstream forward.
- `capture-orchestrator`: command-level orchestration of native request capture — wires the certificate store, capture proxy and artifact writer, invokes the provider adapter capture through the proxy, and returns the artifact paths.

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
- `kimi-provider`: Kimi provider adapter.
- `kimi-client-provider`: thin Kimi endpoint for the Core universal client — Kimi dialect specifics (`api.kimi.com/coding/v1`, `kimi-for-coding`, `reasoning_content`) and the `ClientTurnRequest` builder the Core agent loop runs.
- `glm-client-provider`: thin GLM endpoint for the Core universal client — Z.ai coding dialect specifics (`api.z.ai/api/coding/paas/v4`, `Accept-Language`, `reasoning_content`, GLM `extraBody` params) and the `ClientTurnRequest` builder the Core agent loop runs.
- `glm-native-provider`: GLM native provider adapter.
- `openrouter-provider`: OpenRouter provider adapter.
- `local-models-provider`: local model provider adapter.
- `provider-turn-runner`: deprecated direct dispatch debt retained only until Core-owned provider dispatch replaces existing UI wiring; Application Shell must not extend it.

### Provider Home And Auth

- `provider-home-manager`: isolated provider home layout.
- `provider-auth-store`: API keys/auth references outside tracked workspace files.

### Provider Events And Translation

- `provider-event-normalizer`: provider stream/event normalization.
- `usage-context-telemetry`: usage limits and context-window signals.
- `provider-translation-engines`: provider-backed UI/reasoning translation engines.
