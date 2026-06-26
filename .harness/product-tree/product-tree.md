# Harness AI Product Tree

The machine source of truth is `.harness/product-tree/product-tree.json`. This Markdown file is the readable projection for review in VS Code.

## Rules

- Production code lives under `product-parts/**`.
- Every Product Part contains Clusters; every Cluster contains Modules.
- Every module exposes one public facade boundary when implementation starts.
- CodeAI Hub is reference material only. Do not copy modules wholesale.
- The Intent Normalization cluster is scaffolded for MVP architecture, but it is not wired into the session turn path until direct provider sessions work.

## Application Shell

Standalone Electron application surface around the session UI.

### Electron Host

- `app-bootstrap`: Electron lifecycle, window creation, local app startup.
- `core-process-bridge`: starts or connects to the local Core Runtime process.
- `vscode-link-opener`: opens absolute file links in Visual Studio Code.

### Session Interface

- `session-window`: transcript/dialog layout and session chrome.
- `input-controls`: message input, Stop/Play controls, busy/lock display.
- `session-telemetry`: usage limits, context window, provider/model status surfaces.
- `session-sidebar`: workspace switcher, workspace sessions list, session rename, Settings entry.

### Settings Surface

- `provider-settings-ui`: provider cards, auth/model/reasoning controls.
- `localization-settings-ui`: UI language and reasoning translation controls.
- `recovery-controls-ui`: Core restart/recovery action surface.

## Core Runtime

Long-running local authority for workspaces, sessions, orchestration, settings, localization, and workspace truth.

### Workspace Architecture

- `workspace-registry`: known workspaces and active workspace selection.
- `product-tree-store`: product-tree JSON and Markdown projection.
- `workspace-skeleton-materializer`: creates filesystem structure from the approved product tree.
- `workspace-link-contract`: emits file-link targets for Application Shell.

### Session Runtime

- `session-registry`: session metadata, create/open/rename.
- `session-history-store`: append-only JSONL history.
- `turn-lifecycle`: running/idle/failure state, Stop/Continue boundaries.
- `session-snapshot-projector`: read model for the Electron session UI.

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

Provider adapters, provider homes/auth, usage telemetry, and provider-backed translation engines.

### Provider Registry

- `provider-registry`: provider catalog and availability.
- `provider-descriptor`: model/reasoning capabilities and UI metadata.
- `provider-health`: status, startup, and recovery reporting.

### Provider Adapters

- `claude-provider`: Claude provider adapter.
- `codex-provider`: Codex provider adapter.
- `kimi-provider`: Kimi provider adapter.
- `glm-native-provider`: GLM native provider adapter.
- `glm-opencode-provider`: GLM OpenCode provider adapter.
- `openrouter-provider`: OpenRouter provider adapter.
- `local-models-provider`: local model provider adapter.
- `provider-turn-runner`: dispatches selected session turns to the concrete provider adapter.

### Provider Home And Auth

- `provider-home-manager`: isolated provider home layout.
- `provider-auth-store`: API keys/auth references outside tracked workspace files.
- `provider-runtime-files`: runtime caches/logs ignored from workspace truth.

### Provider Events And Translation

- `provider-event-normalizer`: provider stream/event normalization.
- `usage-context-telemetry`: usage limits and context-window signals.
- `provider-translation-engines`: provider-backed UI/reasoning translation engines.
