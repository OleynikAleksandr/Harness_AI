# Profile Materializer Module

## Responsibility

Own the provider-neutral session profile payload: assemble the applied
prompt (profile workflow body + the thin system wrapper: workspace path,
session start date, chat/artifact language contract, optional workspace
`AGENTS.md` content) and carry the effective tooling categories plus a
content hash of the applied material. The payload is provider-neutral by
contract: provider-specific additions (for example the GLM Native tool
contract) belong to the adapters' profile application layers. The assembled
prompt is what the applied profile snapshot freezes at create; it is never
rebuilt from live data afterwards (`docs/architecture/SessionProfiles.md`).

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
  over the applied prompt + categories for snapshot diagnostics. Optional
  wrapper sections are omitted when their context values are absent.

## Owned Paths

- `module.md`
- `src/**`
