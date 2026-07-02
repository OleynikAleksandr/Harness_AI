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

- `NativeCaptureWriterOptions`: capture id, provider id (`claude` | `codex` |
  `kimi`), output directory, optional selected model id, optional release
  version, optional clock (for deterministic artifacts in tests).
- `CapturedNativeRequest` values from the capture proxy: method, path,
  target, headers, raw body and body text, timestamp.

## Outputs

- `redactCaptureHeaders(headers)`: masks credential-bearing headers
  (`authorization`, `cookie`, `api-key`, `token`, `secret`, `session`,
  `credential`, `oauth`, and credential-valued `x-stainless-*`) with
  `[REDACTED]` before anything is written to disk.
- `extractCaptureSections(body)`: normalizes Anthropic (`system`, `messages`)
  and OpenAI/Codex (`instructions`, `input`) field names onto one
  `system` / `tools` / `messages` section shape.
- `buildNativeRequestCaptureMarkdown(options)`: the readable dump with
  provider, selected model, summary, redacted headers, and the extracted
  system prompt / tool declarations / messages sections. Always states
  `Sent upstream: false`.
- `NativeRequestCaptureWriter`: creates the paired
  `<timestamp>-<provider>-native-request.{jsonl,md}` artifacts, appends
  `capture_start` / `request_captured` / `section_extract` / `capture_end`
  JSONL records, and rewrites the markdown twin after each record. Every
  captured request is redacted before it is persisted; the raw request body
  is kept (it is the diagnostic payload) but auth headers are not.

## Owned Paths

- `module.md`
- `src/**`
