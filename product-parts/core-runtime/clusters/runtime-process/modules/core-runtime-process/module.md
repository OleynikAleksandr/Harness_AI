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
- On `delete-session` RPC, orchestrates session removal: deletes the session's
  event log and asks the provider adapter to delete its own per-session artifact
  (e.g. the Codex rollout) so nothing outlives the session record.

## Owned Paths

- `module.md`
- `src/**`
