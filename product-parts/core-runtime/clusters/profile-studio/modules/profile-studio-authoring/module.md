# Profile Studio Authoring Module

## Responsibility

Own the controlled boundary between a Profile Creator Agent full-snapshot
proposal and managed profile mutation. The facade validates all text fields,
requires one honest provider tool mode (`claude-subset`, `codex-fixed`, or
`kimi-candidate`), validates structured tool objects and unique tool names,
then delegates the normalized snapshot to `ProfileStudioLifecycleFacade`.

An optional Native Capture donor is accepted only as a raw `.jsonl` path whose
real path is inside the HARNESS_AI_HOME-aware capture root. The facade reads raw
request truth and its sibling diagnostics, requires a completed capture,
consistent capture id and exact provider/model match (`kimi-client` maps only
to the diagnostic `kimi` capture channel), then stores immutable real path,
capture id and sha256 request hash provenance. Markdown and diagnostics-only
paths, symlink escapes, malformed/incomplete captures and mismatched targets
change nothing.

The module does not expose filesystem tools to the creator, assign Valid,
judge behavioral quality or implement Custom Capture. Kimi tool selection is
an authorable candidate only; a later capability gate still blocks approval.

## Public Facade

`ProfileStudioAuthoringFacade`

## Inputs

- `ProfileStudioLifecycleFacade` get/apply commands.
- Profile id plus complete `ProfileStudioCreatorSnapshot`.
- Optional configured Capture root; defaults to
  `~/.harness-ai/logs/native-request-capture` (`HARNESS_AI_HOME` aware).

## Outputs

- A normalized lifecycle update containing two prompt parts, purpose,
  validated donor provenance and provider-appropriate structured tools.
- Structured validation errors with no partial write.

## Owned Paths

- `module.md`
- `src/**`
