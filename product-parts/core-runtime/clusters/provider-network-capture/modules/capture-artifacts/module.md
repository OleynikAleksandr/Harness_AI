# Capture Artifacts Module

## Responsibility

Own the artifact side of native request capture: the shared capture type
model, credential-header redaction, provider-neutral section extraction
(system prompt / tool schemas / messages), the human-readable markdown
builder, and the append-only JSONL + markdown writer. This is the part that
turns a raw captured request into readable reference dumps.

Behavior ported from the CodeAI-Hub `provider-network-capture` writer /
redaction / markdown modules, collapsed into one facade for Harness AI.

## Public Facade

`capture-artifacts-facade.ts`

## Inputs

- `NativeCaptureWriterOptions`: capture id, provider id (`claude` | `codex` —
  the ACP `kimi` capture channel left with the kimi-provider retirement,
  2026-07-05), output directory, optional selected model id, optional release
  version, optional clock (for deterministic artifacts in tests).
- `CapturedNativeRequest` values from the capture proxy: method, path,
  target, headers, raw body and body text, timestamp.

## Outputs

- `redactCaptureHeaders(headers)`: masks credential-bearing headers
  (`authorization`, `cookie`, `api-key`, `token`, `secret`, `session`,
  `credential`, `oauth`, `account-id` (e.g. Codex's `chatgpt-account-id`),
  and credential-valued `x-stainless-*`) with `[REDACTED]` before anything is
  written to disk.
- `extractCaptureSections(body)`: normalizes Anthropic (`system`, `messages`),
  OpenAI/Codex (`instructions`, `input`) and OpenAI-chat
  (`messages[role=system]`) field names onto one `system` / `tools` /
  `messages` section shape. The Codex WebSocket `response.create` frame carries
  `instructions`/`tools`/`input` at the top level (its `type` field is
  ignored), so the same mapping extracts a full pair from it. The OpenAI-chat
  form has no top-level system field, so the first `role: "system"` chat
  message's content becomes the system section (the messages section still
  keeps the full array).
- `buildNativeRequestCaptureMarkdown(options)`: the readable dump with
  provider, selected model, summary, redacted headers, and the extracted
  system prompt / tool declarations / messages sections. Always states
  `Sent upstream: false`.
- `NativeRequestCaptureWriter`: creates the paired
  `<timestamp>-<provider>-<model>-native-request.{jsonl,md}` artifacts (the
  model segment is the sanitized selected model id, omitted when no model was
  selected, so dumps for different models are distinguishable), appends
  `capture_start` / `request_captured` / `section_extract` /
  `applied_input_envelope` / `provider_diagnostic_context` / `capture_end`
  JSONL records, and rewrites the markdown twin after each record. Every
  captured request is redacted before it is persisted; the raw request body
  is kept (it is the diagnostic payload) but auth headers are not.
- `recordAppliedInputEnvelope(envelope)` and `recordDiagnosticContext(record)`
  let a provider adapter report what it applied and provider-specific
  diagnostics, rendered in the `Applied Input Envelope` and
  `Diagnostic Context` markdown sections. When no HTTP request was
  intercepted, the summary states "No HTTP request intercepted" for the
  envelope-only case without regressing the captured-request output. (The
  wire-only artifact path was introduced for the ACP Kimi capture, which left
  with the kimi-provider retirement 2026-07-05; the envelope/diagnostic
  channel itself stays a generic writer capability.)

## Owned Paths

- `module.md`
- `src/**`
