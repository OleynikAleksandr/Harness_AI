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
payload fields. For Codex
native-bundle profiles this means `codex-synthetic-native-custom` keeps
`system-prompt.md` byte-aligned with the pure native baseline and stores
workspace/custom rules only in `custom-instructions.md`; this module inserts
that sidecar into the final `instructions` (after `# General` when present).
Provider adapters may then add transport/runtime fields such as CodexUC
`prompt_cache_key`, but those fields are not profile-store documents. The
assembled payload is what the applied profile snapshot freezes at create; it
is never rebuilt from live data afterwards
(`docs/architecture/SessionProfiles.md`).

## Public Facade

`ProfileMaterializerFacade`

## Inputs

- A valid `SessionProfile` resolved by `profile-catalog`.
- `SessionProfileMaterializationContext`: session start date (required),
  optional workspace path, chat/artifact languages, and workspace
  instructions content supplied by the caller when the channel does not
  inject them natively.

## Outputs

- `MaterializedSessionProfilePayload`: assembled `prompt`, `profileId`,
  `profileName`, effective `toolingCategories`, and a sha256 `contentHash`
  over the applied prompt + categories + native request bundle for snapshot
  diagnostics. Optional wrapper sections are omitted when their context values
  are absent. Native bundle profiles may also output `inputPrefix`,
  `requestTemplate`, and `tools` for adapters that can send provider-native
  structured request data.

## Owned Paths

- `module.md`
- `src/**`
