# Harness AI Product Tree

The machine source of truth is `.harness/product-tree/product-tree.json`. This Markdown file is the readable projection for review in VS Code.

## Rules

- Production code lives under `product-parts/**`.
- Every Product Part contains Clusters; every Cluster contains Modules.
- Every module exposes one public facade boundary when implementation starts.
- CodeAI Hub is reference material only. Do not copy modules wholesale.
- The Intent Normalization cluster is scaffolded for MVP architecture, but it is not wired into the session turn path until direct provider sessions work.

## Application Shell

Standalone Electron interface surface and Core supervisor/client. It owns no backend truth.

Application Shell submits user input, displays Core read models/events, manages windows, and supervises the Core process. It must not compose Core Runtime or Provider Runtime implementation modules in-process.

### Electron Host

- `app-bootstrap`: Electron lifecycle, window creation, local app startup.
- `core-process-bridge`: starts, stops, restarts, health-checks, or connects to the local Core Runtime process through process contracts only.
- `vscode-link-opener`: opens absolute file links in Visual Studio Code.

### Session Interface

- `session-window`: transcript/dialog layout, session chrome, and next-session mode panel from Core read models.
- `input-controls`: message input, Stop/Play controls, busy/lock display, and user intent submission only.
- `session-telemetry`: usage limits, context window, provider/model status surfaces from Core telemetry.
- `session-sidebar`: workspace switcher, workspace sessions list, next-session mode entry, session rename, Settings entry.

### Settings Surface

- `provider-settings-ui`: provider cards, auth/model/reasoning controls submitted through Core contracts.
- `localization-settings-ui`: UI language and reasoning translation controls submitted through Core contracts.
- `recovery-controls-ui`: Core restart/recovery action surface backed by a real Core process stop/start lifecycle.

## Core Runtime

Out-of-process long-running local authority for workspaces, sessions, orchestration, provider composition, settings, localization, and workspace truth.

### Workspace Architecture

- `workspace-registry`: known workspaces and active workspace selection.
- `product-tree-store`: product-tree JSON and Markdown projection.
- `workspace-skeleton-materializer`: creates filesystem structure from the approved product tree.
- `workspace-link-contract`: emits file-link targets for Application Shell.

### Session Runtime

- `session-registry`: session metadata, create/open/rename.
- `session-request-handler`: Core-owned create/resume/send/stop routing, provider dispatch, and next-session mode truth for session actions.
- `provider-session-binding`: Core session to provider session id and binding state.
- `session-event-stream`: provider-neutral Core session events for Application Shell projections.
- `session-history-store`: append-only JSONL history.
- `turn-lifecycle`: running/idle/failure state, Stop/Continue boundaries.
- `session-snapshot-projector`: read model for the Electron session UI.
- `session-reasoning-display`: projects provider-visible reasoning/thinking into Core dialog messages.

### Development Orchestrator

- `plan-orchestrator`: plan-first lifecycle and recovery state.
- `git-transaction-manager`: git init, automatic commits, clean-tree checks.
- `task-scope-guard`: Product Part / Cluster / Module ownership and file-scope checks.
- `quality-gate-runner`: post-skeleton quality commands and hooks.

### Intent Normalization

- `intent-envelope-contract`: normalized request schema.
- `normalizer-provider-runner`: calls a chosen provider/model for normalization.
- `execution-envelope-validator`: validates normalized output before executor dispatch.

### Settings And Localization

- `settings-store`: global/workspace settings persistence.
- `localization-runtime`: UI localization bootstrap and bundle state.
- `reasoning-translation-overlay`: async translation of visible reasoning/thinking.

## Provider Runtime

Independent provider adapters, provider homes/auth, usage telemetry, and provider-backed translation engines composed by Core Runtime only.

### Provider Registry

- `provider-registry`: provider catalog, availability, invocation profile descriptors, and Core-owned adapter registration.
- `provider-descriptor`: model/reasoning capabilities and UI metadata.
- `provider-health`: status, startup, and recovery reporting.

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
- `provider-runtime-files`: runtime caches/logs ignored from workspace truth.

### Provider Events And Translation

- `provider-event-normalizer`: provider stream/event normalization.
- `usage-context-telemetry`: usage limits and context-window signals.
- `provider-translation-engines`: provider-backed UI/reasoning translation engines.
