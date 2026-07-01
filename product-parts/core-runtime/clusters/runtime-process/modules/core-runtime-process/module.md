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
- Localization runtime bootstrap payloads are materialized through Core RPC into
  the Harness home `Localization` directory, using Core settings category
  mapping and provider-owned translation engines so browser clients render
  Core-owned localization state instead of deriving it locally. The engine set
  passed to the provider translation facade is built from the saved OpenRouter
  connection and `uiTranslation`/`reasoningTranslation` profiles (via
  `createProviderTranslationEngines`), so a configured OpenRouter model is
  available whenever the UI Translation Engine setting selects it, alongside
  the always-available `google-gtx` engine.
- Dynamic renderer text that cannot be part of static source dictionaries, such
  as OpenRouter model descriptions returned by provider search, is translated by
  the `translate-dynamic-text` Core RPC. The RPC uses the saved Reasoning
  Translation Engine and the `reasoning` localization category language, keeping
  translation execution inside Core/provider-owned boundaries.
- The category mapping follows the settings controls that users see in General:
  `uiInterface` feeds `ui_labels`, `userGuidance` feeds `ui_helper_text`, and
  `systemFeedback` feeds `messages_for_the_user`.

## Owned Paths

- `module.md`
- `src/**`
