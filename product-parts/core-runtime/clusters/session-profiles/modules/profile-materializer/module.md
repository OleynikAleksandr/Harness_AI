# Profile Materializer Module

## Responsibility

Own the provider-neutral session profile payload: assemble the applied
prompt (profile workflow body + the thin system wrapper: workspace path,
session start date, chat/artifact language contract, optional workspace
`AGENTS.md` content) and carry the effective tooling categories plus a
content hash of the applied material. For profiles that carry a native request
bundle, the materializer does not append the Harness session wrapper; it uses
the profile prompt as provider-facing native instructions, inserts optional
`custom-instructions.md` text into the native prompt body, and forwards
`input-prefix.json`, `request-template.json`, and `tools.json` as structured
payload fields. The
assembled payload is what the applied profile snapshot freezes at create; it
is never rebuilt from live data afterwards
(`docs/architecture/SessionProfiles.md`).

Studio v2 uses a separate deterministic branch: trim and join
`system-prompt.md`, one blank line, then `custom-instructions.md`. It ignores
every session wrapper input, including workspace path, `AGENTS.md`, language
and date, and does not add a generic workflow skeleton. Its content hash covers
the compiled two-part prompt, effective structured tools, exact provider/model
target and immutable Native Capture donor provenance. Legacy v1 and synthetic
native materialization remain byte-for-byte on their previous branches.

## Public Facade

`ProfileMaterializerFacade`

## Inputs

- A valid `SessionProfile` resolved by `profile-catalog`.
- `SessionProfileMaterializationContext`: session start date (required),
  optional workspace path, chat/artifact languages, and workspace
  instructions content supplied by the caller when the channel does not
  inject them natively.
- For Studio v2, the context is intentionally ignored; both stored prompt
  source parts and structured tools/provenance are the complete input.

## Outputs

- `MaterializedSessionProfilePayload`: assembled `prompt`, `profileId`,
  `profileName`, effective `toolingCategories`, and a sha256 `contentHash`
  over the applied prompt + categories + native request bundle for snapshot
  diagnostics. Optional wrapper sections are omitted when their context values
  are absent. Native bundle profiles may also output `inputPrefix`,
  `requestTemplate`, and `tools` for adapters that can send provider-native
  structured request data.
- Studio v2 output has no ambient wrapper and carries a deterministic hash over
  its two prompt parts plus target/tools/donor truth.

## Owned Paths

- `module.md`
- `src/**`
