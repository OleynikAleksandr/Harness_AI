# Capture Artifacts Module

## Responsibility

Own the artifact side of native request capture: the shared capture type
model, credential-header redaction, provider-neutral section extraction
(system prompt / tool schemas / messages), the human-readable markdown
builder, the raw upstream-request JSONL writer, and the separate diagnostics
JSONL writer. This is the part that turns a raw captured request into readable
profile-verification dumps.

Behavior ported from the CodeAI-Hub `provider-network-capture` writer /
redaction / markdown modules, collapsed into one facade for Harness AI.

## Public Facade

`capture-artifacts-facade.ts`

## Inputs

- `NativeCaptureWriterOptions`: capture id, provider id (`claude` | `codex` |
  `kimi`; Kimi is a diagnostic native-CLI channel, not the retired ACP
  runtime provider), output directory, optional selected model id,
  optional selected reasoning effort, optional release version, optional
  clock (for deterministic artifacts in tests).
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
  ignored), so the same mapping extracts a full pair from it. Codex 0.144.1
  instead places tool declarations in a developer-role `input` item with
  `type: "additional_tools"` and its base `You are Codex...` instructions in
  the following developer message. The extractor promotes those structural
  items into the tool/system sections and removes them from developer context,
  while preserving permissions, skills, plugins and other developer messages.
  The OpenAI-chat
  form has no top-level system field, so the first `role: "system"` chat
  message's content becomes the system section (the messages section still
  keeps the full array).
- `buildNativeRequestCaptureMarkdown(options)`: the readable dump with
  provider, selected model, summary, request metadata, redacted headers,
  request parameters, applied Harness/profile envelope, diagnostics pointers
  and the three profile-relevant payload groups Harness compares when changing
  profiles: `System Prompt`, `Tool Declarations`, and `Developer Context:
  Permissions, Skills, Plugins`. String payloads, including embedded Codex base
  instructions and `additional_tools` descriptions, are rendered as readable
  text blocks with real newlines and spacing instead of JSON-escaped `\n`
  sequences; structured schemas remain fenced JSON.
- `NativeRequestCaptureWriter`: creates the artifact set
  `<timestamp>-<provider>-<model>-<reasoning>-native-request.jsonl`,
  `<timestamp>-<provider>-<model>-<reasoning>-native-request.diagnostics.jsonl`,
  and `<timestamp>-<provider>-<model>-<reasoning>-native-request.md`. Model and
  reasoning segments are sanitized; direct legacy writer callers may omit
  either, while the Core capture command supplies both so dumps for different
  model/effort pairs are distinguishable. The selected reasoning value is the
  Core/app-server intent (for example Codex `ultra`), not a value re-derived
  from a provider-normalized upstream body. `capture_start` records both
  selected dimensions in diagnostics. The raw JSONL appends only
  `request_captured` records from the proxy path. The diagnostics JSONL
  appends local lifecycle, applied-envelope, provider-context and completion
  records. Every captured request is redacted before it is persisted; the raw
  request body is kept because it is the diagnostic payload, but auth headers
  are not.
- `recordAppliedInputEnvelope(envelope)` and `recordDiagnosticContext(record)`
  let a provider adapter report what it applied and provider-specific
  diagnostics, rendered in the `Applied Harness/Profile Envelope` and
  `Diagnostics` markdown sections and persisted to the diagnostics JSONL.
  When no HTTP request was intercepted, the summary states "No HTTP request
  intercepted" for the envelope-only case without polluting the raw JSONL
  artifact. (The wire-only artifact path was introduced for the ACP Kimi
  capture, which left with the kimi-provider retirement 2026-07-05; the
  envelope/diagnostic channel itself stays a generic writer capability.)

## Owned Paths

- `module.md`
- `src/**`
