# Profile Studio Creator Bootstrap Module

## Responsibility

Owns the mechanical Capture-first preparation that must succeed before Core
creates a target Draft or Creator Agent session. It maps Studio target ids to
diagnostic capture channels (`kimi-client` to `kimi`), invokes a supplied
Native Capture runner and validates the resulting raw artifact.

Validation is limited to Core-owned envelope facts: HARNESS_AI_HOME capture
root containment after symlink resolution, readable JSONL records, successful
`capture_end`, matching capture id/provider/model, at least one captured
request and SHA-256. It intentionally does not parse provider prompt, tool or
message field markers; that semantic work belongs to the Creator Agent.

## Public Facade

`ProfileStudioCreatorBootstrapFacade`

## Inputs

- Exact target provider/model/reasoning and Studio workspace path.
- Injected native capture runner.

## Outputs

- Immutable `ProfileStudioCreatorCaptureProvenance`: target and capture
  identities, exact canonical raw JSONL path, captured reasoning and SHA-256.
- Structured failure before Draft/session creation when Capture or validation
  fails.

## Owned Paths

- `module.md`
- `src/**`
