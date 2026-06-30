# Settings And Localization Cluster

## Boundary

Owns settings persistence, UI localization runtime materialization, and visible
reasoning/thinking translation overlay policy/state.

## Owned Modules

- `settings-store`
- `localization-runtime`
- `reasoning-translation-overlay`

## Facade Rule

Provider-backed translation engines are called through Provider Runtime. Core
owns settings-derived policy, browser localization payloads, reasoning source
hashes, pending state, sidecar overlay records and rendered patch payloads.
Renderer/client code only displays Core/shared read-model fields.

Settings diagnostics are Core-owned runtime state. Settings Store writes
sanitized JSONL entries under `~/.harness-ai/logs/core/`; Application Shell logs
may use the sibling `logs/interface/` root, and provider diagnostics may use
`logs/providers/`.
