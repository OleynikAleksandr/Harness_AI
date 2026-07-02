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
- `glm-native-provider`: GLM native provider adapter.
- `glm-opencode-provider`: GLM OpenCode provider adapter.
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
