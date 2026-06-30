# Core Runtime Process Module

## Responsibility

Runs the Core Runtime as an out-of-process local server.

This module owns the process entrypoint and process contracts used by the
Application Shell supervisor/client: health, status, shutdown, Core RPC, and
Core event streaming. Session, provider and settings truth stays inside this
Core process boundary. Provider CLI/version tooling and local-model discovery
also run here so the Application Shell remains UI/supervisor/client only.

## Public Facade

`CoreRuntimeProcessFacade`

## Inputs

- Core process host and port options.
- Shutdown request from the local supervisor/client.
- Core RPC envelope from the Application Shell client.
- Provider version/update requests and local-model discovery requests.

## Outputs

- Local HTTP process contract.
- Health/status payload with process identity.
- Graceful shutdown acknowledgement.
- Server-sent Core events and RPC results.
- In-memory provider readiness events (`provider:status`) derived from raw
  readiness changes for the active workspace; these are streamed to clients but
  not written to session history JSONL.
- Provider version snapshots, provider update results and local-model lists.
  CLI update targets run the provider's own self-update command (`claude update`,
  `codex update`, `opencode upgrade`) so the active install is updated wherever it
  lives; SDK targets use `npm install -g <pkg>@latest`. This avoids updating a
  stale `~/.npm-global` copy while a native installer (e.g. `~/.local/share/claude`)
  stays first on PATH.
- On `delete-session` RPC, orchestrates session removal: deletes the session's
  event log and asks the provider adapter to delete its own per-session artifact
  (e.g. the Codex rollout) so nothing outlives the session record.
- Localization runtime bootstrap payloads are exposed through Core RPC so
  browser clients render Core-owned localization state instead of deriving it
  locally.

## Owned Paths

- `module.md`
- `src/**`
