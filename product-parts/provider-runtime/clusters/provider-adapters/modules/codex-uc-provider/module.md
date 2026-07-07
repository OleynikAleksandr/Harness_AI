# Codex UC Provider Module

## Responsibility

Expose a test provider named `CodexUC` that uses the Codex OAuth
Responses-compatible backend instead of the Codex app-server. This provider is
for lean subscription-backed experiments where Harness controls the
provider-facing prompt and function tool surface directly.

The adapter reads the ChatGPT/Codex OAuth token from the local Codex auth file,
posts streamed Responses-compatible requests to
`https://chatgpt.com/backend-api/codex/responses`, and runs a local function
tool loop through the existing universal-client tool registry. It accepts the
Core immutable session profile snapshot: managed profiles become the request
`instructions`. If the snapshot carries a Codex native request bundle,
`request-template.json` contributes static Responses request fields and
`tools.json` supplies the provider-facing structured tool declarations; the
local registry still executes returned function calls. Native currently uses a
short Harness-owned fallback instruction because this route has no app-server
native prompt assembly.

Unlike `codex-provider`, this module does not start `codex app-server`, does
not receive the app-server built-in tool surface, does not use app-server
`thread/rollback`, and does not use server-side `store:true` response state. It
keeps its own in-memory Responses input history per Harness session and replays
that history on each turn with `store:false`; its rollback capability prunes
that local input history from the requested user turn so subsequent requests do
not resend the removed tail.

## Public Facade

`CodexUcProviderFacade`

## Inputs

- Workspace path.
- Core session profile payload from the immutable applied profile snapshot.
  Codex native-bundle profiles may include structured `requestTemplate` and
  `tools` fields in addition to the materialized prompt.
- Per-turn model/reasoning settings from the existing Codex settings section.
- Local Codex OAuth auth file (`~/.codex/auth.json`).

## Outputs

- Normalized provider events for Core session display.
- Function tool execution through the Harness universal-client tool registry.
- Token/cache telemetry from Responses `usage.input_tokens` and known cached
  token aliases (`input_tokens_details.cached_tokens`,
  `cached_input_tokens`, etc.). Missing cache fields stay unknown; the adapter
  never forces unknown cache telemetry to `0`.
- Visible reasoning is requested with `reasoning.summary: "detailed"` plus the
  selected effort. Reasoning telemetry from direct Responses reasoning summary
  stream deltas/items is buffered for the active Responses call and emitted as
  coalesced Core-visible `thinking` dialog messages, not one row per provider
  delta.
- Usage-limit telemetry through the proven Codex account-limits bridge
  (`account/rateLimits/read`) plus a best-effort direct response-header fast
  path when the backend provides Codex session/weekly limit percentages or
  limit/remaining pairs. If neither source provides values, Core displays the
  Codex-family limit rows as pending rather than fabricating values.
- Provider profile application details recording the selected route,
  profile id, native tool/template source when present, and experimental
  `store:false` state model.

## Owned Paths

- `module.md`
- `src/**`
