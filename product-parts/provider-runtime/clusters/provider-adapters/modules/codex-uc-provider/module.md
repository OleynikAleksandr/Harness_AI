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
local registry still executes returned function calls. The profile sidecar can
remain an exact native capture, but this HTTP route sanitizes transport-only
fields rejected by `/backend-api/codex/responses` (for example top-level
`type`, which belongs to the captured WebSocket/envelope shape). Native
currently uses a short Harness-owned fallback instruction because this route
has no app-server native prompt assembly. The adapter serializes the outgoing
HTTP body in a cache-optimized order: `model`, `instructions`, structured
`tools`, then dynamic `input` and the remaining request options. The unsupported
native envelope `type` stays on disk in the exact sidecar but is omitted from
the HTTP request. This intentionally keeps the provider-facing prompt and tool
surface adjacent instead of letting changing session history split them.

Unlike `codex-provider`, this module does not start `codex app-server`, does
not receive the app-server built-in tool surface, does not use app-server
`thread/rollback`, and does not use server-side `store:true` response state. It
keeps its own in-memory Responses input history per Harness session and replays
that history on each turn with `store:false`; its rollback capability prunes
that local input history from the requested user turn so subsequent requests do
not resend the removed tail.

The adapter also implements the diagnostic Native Request Capture boundary for
CodexUC. Capture is profile-qualified: Core passes an explicit `profileId`
from the Settings capture card, the adapter reads
`~/.harness-ai/Profiles/Codex/<profileId>/system-prompt.md`,
`request-template.json`, `tools.json`, and optional
`custom-instructions.md`, assembles the same native-bundle prompt shape used by
normal managed sessions, builds the Responses body through
`buildCodexUcResponsesRequest`, and sends that HTTP POST through the shared
MITM capture proxy. The artifact records an applied envelope with
`kind: "codex-uc"`, the selected profile id, route
`codex-oauth-responses`, and `toolSurface: "profile-native-tools"` so cache
diagnostics can compare app-server Codex and CodexUC without guessing which
static profile was used.

## Public Facade

`CodexUcProviderFacade`

## Inputs

- Workspace path.
- Core session profile payload from the immutable applied profile snapshot.
  Codex native-bundle profiles may include structured `requestTemplate` and
  `tools` fields in addition to the materialized prompt.
- Per-turn model/reasoning settings from the existing Codex settings section.
- Local Codex OAuth auth file (`~/.codex/auth.json`).
- Native Request Capture options: proxy/certificate context, selected model,
  selected profile id, and diagnostic writer callbacks.

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
- CodexUC Native Request Capture artifacts with explicit profile identity,
  request shape diagnostics (top-level keys, instruction bytes, tool count and
  tool bytes), redacted auth headers, and the captured HTTP body.

## Owned Paths

- `module.md`
- `src/**`
